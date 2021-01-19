const express = require('express');
const fs = require('fs');
const https = require('https');
const path = require('path');

// Database setup and access to collections
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const libraryAdapter = new FileSync('storage/data/library.json');
const queueAdapter = new FileSync('storage/data/queue.json');
const collectionsAdapter = new FileSync('storage/data/collections.json');

const library = low(libraryAdapter);
const queue = low(queueAdapter);
const collections = low(collectionsAdapter);

// import socketIO from "socket.io";

const { spawn } = require("child_process");
const ytdl = require('ytdl-core');
const YoutubeMusicApi = require('youtube-music-api')

const ytapi = new YoutubeMusicApi()
ytapi.initalize() // Retrieves Innertube Config

const ffplay = require("ffplay");

var playing = null;
var downloading = false;
var autoplay = false;
var player = null;

export default (app, http) => {
	// optional support for socket.io
	
	// let io = socketIO(http);
	// io.on("connection", client => {
	// 	client.on("message", function(data) {
	// 		// do something
	// 	});
	// 	client.emit("message", "Welcome");
	// });

	function init() {
		// configure access control for local files
		app.use(function(req, res, next) {
			res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
			res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
			res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
			next();
		});
		app.use(express.json());

		// configure routes
		// Search using the "all" category
		app.post('/api/search/:query', (req, res) => {
			console.log("new search request for ", req.params.query);
			ytapi.search(req.params.query, "")
				.then(result => {
					// pre-sort into category based arrays
					let sorted = sortSearchResults(result.content, req);
					res.json({
						content: sorted,
						continuation: result.continuation
					});
				});
		});

		// Search using a specific category, e.g. song, album, artist, video
		app.post('/api/search/:filter/:query', (req, res) => {
			console.log("new search request for ", req.params.query, " in ", req.params.filter);
			ytapi.search(req.params.query, req.params.filter)
				.then(result => {
					let sorted = sortSearchResults(result.content, req);
					res.json({
						content: sorted,
						continuation: result.continuation
					});
				});
		});

		// Get next page of search results
		// Search API returns a 'continuation' array which must be passed in here
		app.post('/api/searchpage/next', (req, res) => {
			console.log("Requesting next search results page");
			ytapi.searchNext(req.body.continuation, req.body.filter)
				.then(result => {
					let sorted = sortSearchResults(result.content, req);
					res.json({
						content: sorted,
						continuation: result.continuation
					});
				})
				.catch(err => {
					console.log(err);
				});
		});

		app.post('/api/addToQueue', (req, res) => {
			let queueAttempt = addToQueue(req.body);
			res.json({response: queueAttempt});
		});

		app.post('/api/controls/next', (req, res) => {
			skipSong();
			res.json({response: "skipping"});
		});

		// set express to serve static assets in thumbnails folder
		app.use('/thumbnails', express.static('storage/art/thumbnails'));

		// setup database defaults
		library.defaults({ songs: [], artists: [], albums: [], thumbnails: []})
			.write();
		queue.defaults({ playQueue: [], downloadQueue: []})
			.write();
		collections.defaults({ history: [], playlists: []})
			.write();

		// if items are still in playlist, start where we left off
		checkPlaybackState();
		checkDownloadState();
	}

	function sortSearchResults(results, req) {
		let newResults = {
			top: [],
			song: [],
			album: [],
			artist: []
		};

		if (results.length) {
			newResults.top.push(results[0]);
		}

		for (let i = 0; i < results.length; i++) {
			// create editable copy
			let entry = {};
			Object.assign(entry, results[i]);

			// take last thumbnail from array
			if (entry.thumbnails.length) {
				entry.thumbnail = entry.thumbnails.pop();
				delete entry.thumbnails;
			}

			// check for locally saved thumbnail
			try {
				let localThumbnail = library.get('thumbnails')
					.find({ url: entry.thumbnail.url })
					.value();

				if (localThumbnail) {
					let fullUrl = req.protocol + '://' + req.get('host') + localThumbnail.localPath;
					entry.thumbnail.url = fullUrl;
				} else {
					try	{
						saveThumbnail(entry.thumbnail.url);
					} catch (e) {
						console.error(e);
					}
				}
			} catch (e) {
				console.error(e);
			}

			// skip types we have not accounted for
			// typically playlists which have unique types, or videos
			let type = entry.type;
			if (!newResults[type]) {
				// newResults[type] = [];
				continue;
			}

			// skip entries which do not have a valid name or video ID
			// likely an issue with youtube results
			if (type === "song" && typeof entry.videoId !== "string" || typeof entry.name !== "string") {
				continue;
			}

			// add to array
			newResults[type].push(entry);
		}

		return newResults;
	}

	/* 
		Determine whether we already have this song locally or if it needs to be downloaded.
		Existing local songs will be queued immediately, taking priority over songs which 
		must be downloaded first. This is to ensure continuous playback over correct order.
		Will also reject songs which already exist in the download or playback queue, to
		prevent stacking of multiple songs.
	*/
	function addToQueue(data) {
		console.log("New request for song: ", data.name, " with ID ", data.videoId);

		// check if already queued for playback
		let inPlayQueue = queue.get('playQueue')
			.find({ videoId: data.videoId })
			.value();

		if (inPlayQueue) {
			console.log("Rejected, song already in playlist");
			checkPlaybackState();
			return "Rejected, song already in playlist";
		}

		// check if already queued for download
		let inDownloadQueue = queue.get('downloadQueue')
			.find({ videoId: data.videoId })
			.value();

		if (inDownloadQueue) {
			console.log("Rejected, song already in download queue");
			checkDownloadState();
			return "Rejected, song already in download queue";
		}

		// check if already exists in database
		let inLibrary = library.get('songs')
			.find({ videoId: data.videoId })
			.value();

		if (inLibrary) {
			console.log("Found locally, adding to queue immediately");
			queueForPlayback(inLibrary);
			return "Found locally, adding to queue immediately";
		}

		// cannot find reference anywhere, attempt to download new copy
		queueForDownload(data);
		return "Queueing for download";
	}

	// song download handling

	function queueForDownload(data) {
		console.log("Queueing ", data.name, " for playback");
		queue.get('downloadQueue')
			.push(data)
			.write();

		checkDownloadState();
	}

	function removeFromDownloadQueue() {
		queue.get('downloadQueue')
			.shift()
			.write();
	}

	function checkDownloadState() {
		if (downloading === false) {
			downloadNextInQueue();
		}
	}

	function downloadNextInQueue() {
		let nextDownload = queue.get('downloadQueue')
			.take(1)
			.value();

		if (nextDownload.length) {
			console.log("Downloading ", nextDownload[0].name);
			downloadSong(nextDownload[0]);
		} else {
			console.log("found nothing in download queue");
		}
	}

	function downloadSong(data) {
		downloading = true;
		console.log(data);
		var newData = {};

		try {
			newData = createLibraryPath(data);
		} catch(e) {
			console.error(e);
			onDownloadFailed(data);
			return;
		}

		if (fs.existsSync(newData.filePath)) {
			// file exists but isn't in database, skip directly to complete download callback
			onDownloadSucceeded(newData);
		} else {
			let options = {
				filter: "audioonly",
				quality: "highestaudio"
			};
			let dl = ytdl('https://www.youtube.com/watch?v=' + newData.videoId, options);
			let ffmpeg = ffmpegSpawnDownloadInstance(newData);
			dl.pipe(ffmpeg.stdin);
		}
	}

	function createLibraryPath(data) {
		let subFolder = "Misc";
		// youtube music api has some inaccuracies with parsing, handle this as best we can
		if (typeof data.artist === "object") {
			// try to categorize by artist first, and is multiple artists, use first
			if (Array.isArray(data.artist) && data.artist.length && data.artist[0].name) {
				subFolder = data.artist[0].name;
			} else if (data.artist.name) {
				subFolder = data.artist.name;
			}
		} else if (typeof data.album === "object") {
			// second try to categorize via album
			if (Array.isArray(data.album) && data.album.length && data.album[0].name) {
				subFolder = data.album[0].name;
			} else if (data.album.name) {
				subFolder = data.album.name;
			}
		}

		let dir = path.join("./storage/music/", subFolder); 
		let fileName = data.name + ".mp3";
		let filePath = path.join(dir, fileName); 

		// create folders if they do not exist yet
		console.log("Path: " + filePath);
		if (!fs.existsSync(dir)){
			fs.mkdirSync(dir);
		}

		// merge both objects using spread operator
		data.dir = dir;
		data.fileName = fileName;
		data.filePath = filePath;

		return data;
	}

	function onDownloadSucceeded(data, isNew) {
		console.log("download success");
		downloading = false;

		removeFromDownloadQueue();

		let inLibrary = library.get('songs')
			.find({ videoId: data.videoId })
			.value();

		if (!inLibrary) {
			library.get('songs')
				.push(data)
				.write();
		}

		queueForPlayback(data);
		checkPlaybackState();
		downloadNextInQueue();
	}

	function onDownloadFailed(data) {
		console.log("download failure");
		downloading = false;
		removeFromDownloadQueue();
		downloadNextInQueue();
	}

	function ffmpegSpawnDownloadInstance(data) {
		var args = ["-i", "pipe:0", "-f", "mp3", "-ac", "2", "-ab", "320k", "-acodec", "libmp3lame", data.filePath];
		var ffmpeg = spawn('ffmpeg', args);
											
		console.log('Spawning ffmpeg ' + args.join(' '));

		ffmpeg.stdout.on("data", data => {
			console.log(`stdout: ${data}`);
		});

		ffmpeg.stderr.on("data", data => {
			console.log(`stderr: ${data}`);
		});

		ffmpeg.on('error', (error) => {
			console.log(`error: ${error.message}`);
			onDownloadFailed(data);
		});

		ffmpeg.on("close", code => {
			console.log(`child process exited with code ${code}`);

			onDownloadSucceeded(data);
			// playAudioFile();
		});

		return ffmpeg;
	}


	// jukebox queue / playback functions

	function queueForPlayback(data) {
		console.log("Queueing ", data.name, " for playback");
		queue.get('playQueue')
			.push(data)
			.write();

		collections.get('history')
			.push({name: data.name, videoId: data.videoId, time: Date.now()})
			.write();

		checkPlaybackState();
	}

	function removeFromPlaybackQueue(videoId) {
		queue.get('playQueue')
			.remove({ videoId: videoId })
			.write();
	}

	function checkPlaybackState() {
		if (playing === null) {
			playNextInQueue();
		}
	}

	function playNextInQueue() {
		// TODO: use raw ffplay commands rather than a plugin
		// var player = new ffplay("./audio/yee.mp3");
		let nextSong = queue.get('playQueue')
			.take(1)
			.value();

		if (nextSong.length) {
			console.log("Now Playing: ", nextSong[0].name);
			playing = nextSong[0];
			playSong(nextSong[0].filePath);
		} else {
			playing = null;
		}
	}

	function playSong(file) {
		player = new ffplay(file);

		player.proc.on('error', (error) => {
			console.log(`error: ${error.message}`);
			onPlaybackComplete();
		});

		player.proc.on("exit", code => {
			console.log(`child process exited`);
			onPlaybackComplete();
		});
	}

	function skipSong() {
		if (player != null) {
			player.stop();
		}
	}

	function onPlaybackComplete() {
		if (playing) {
			player = null;
			removeFromPlaybackQueue(playing.videoId);	
			playing = null;
			playNextInQueue();
		}
	}

	function saveThumbnail(url) {
		// https://lh3.googleusercontent.com/LRmwC9OnuKW1oStH-y6_eKL81ub9pArkrHNczL1WSAVJ6qpwXnFDiXY20_XC1EkGR6szw4UDbG2vv3Jj=w120-h120-l90-rj

		let folder = "./storage/art/thumbnails/";
		let fileName = url.split("/").pop();
		let localPath = folder + fileName + ".jpg";
		// express set to serve static assets using different path prefix
		let assetPath = "/thumbnails/" + fileName + ".jpg";

		let callback = () => {

			library.get('thumbnails')
				.push({ 
					url: url,
					localPath: assetPath
				})
				.write();
		}

		saveImageToDisk(url, localPath, callback);
	}

	function saveImageToDisk(url, localPath, callback) {
		let fullUrl = url;
		let file = fs.createWriteStream(localPath);
		let request = https.get(url, function(response) {
			response.pipe(file);

			try {
				callback();
			} catch (e) {
				console.error(e);
			}
		});
	}

	init();
};
