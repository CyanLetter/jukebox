<template>
	<div class="search-container">
		<div class="controls">
			<button type="button" v-on:click="skipSong">Skip</button>
			<OSCControls/>
		</div>

		<h1>Search</h1>
		<h2>Search Type</h2>
		<ul>
			<li v-on:click="changeSearchType('all')">All</li>
			<li v-on:click="changeSearchType('song')">Song</li>
			<li v-on:click="changeSearchType('album')">Album</li>
			<li v-on:click="changeSearchType('artist')">Artist</li>
		</ul>

		<form v-on:submit.prevent="submitSearch">
			<input type="text" name="search" v-model="searchQuery">
			<button type="button" v-on:click="submitSearch">Search</button>
		</form>

		<section v-if="searchType === 'all'" class="results">
			<section class="category" v-for="(category, index) in searchResults" :key="index">
				<h3 class="section-header"> {{index}} </h3>
				<ul class="entry-container">
					<SearchEntry v-for="(entry, index) in category" :key="index" :entryData="entry" />
				</ul>
			</section>

			<button type="button" v-on:click="nextSearchPage">Next</button>
		</section>

		<section v-else class="results">
			<section class="category">
				<h3 class="section-header"> {{ searchType }} </h3>
				<ul class="entry-container">
					<SearchEntry v-for="(entry, index) in searchResults[searchType]" :key="index" :entryData="entry" />
				</ul>
			</section>

			<button type="button" v-on:click="nextSearchPage">Next</button>
		</section>
	</div>
</template>

<script>
	import SearchEntry from "@/components/SearchEntry.vue";
	import OSCControls from "@/components/OSCControls.vue";
	
	export default {
		name: 'Search',
		components: {
			SearchEntry,
			OSCControls
		},
		data() {
			return {
				sharedStore: window.store,
				searchQuery: "",
				searchResults: {}
			}
		},
		computed: {
			searchType: function() {
				return this.sharedStore.state.searchType;
			},
			searchContinuation: function() {
				return this.sharedStore.state.searchContinuation;
			}
		},
		watch: {
			"sharedStore.state.searchResultsUpdated": function() {
				this.updateResults();
			}
		},
		mounted() {
			
		},
		methods: {
			changeSearchType(type) {
				this.sharedStore.updateSearchType(type);

				if (this.searchQuery.length > 0) {
					// update search for new category
					this.submitSearch();
				}
			},
			submitSearch() {
				this.fetchSearchResults();
			},
			updateResults() {
				this.searchResults = this.sharedStore.state.searchResults;
			},
			selectSong() {

			},
			skipSong() {
				let requestOptions = {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({})
				};
				fetch(window.location.protocol + "//" + window.location.hostname + ":6400/api/controls/next", requestOptions)
					.then(response => response.json())
					.then(response => {
						console.log(response);
					});
			},
			nextSearchPage() {
				this.fetchNextResults();
			},
			fetchSearchResults() {
				let requestOptions = {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({})
				};
				if (this.searchType == "all") {
					fetch(window.location.protocol + "//" + window.location.hostname + ":6400/api/search/" + this.searchQuery, requestOptions)
						.then(response => response.json())
						.then(response => {
							console.log(response.continuation);
							this.sharedStore.updateSearchResults(response.content, response.continuation);
						});
				} else {
					fetch(window.location.protocol + "//" + window.location.hostname + ":6400/api/search/" + this.searchType + "/" + this.searchQuery, requestOptions)
						.then(response => response.json())
						.then(response => {
							console.log(response.continuation);
							this.sharedStore.updateSearchResults(response.content, response.continuation);
						});
				}
			},
			fetchNextResults() {
				if (this.searchContinuation === null) {
					return;
				}
				let requestOptions = {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						continuation: JSON.parse(JSON.stringify(this.searchContinuation)),
						filter: this.searchType
					})
				};
				console.log("requesting next page");
				console.log(requestOptions.body.continuation);
				fetch(window.location.protocol + "//" + window.location.hostname + ":6400/api/searchpage/next", requestOptions)
					.then(response => response.json())
					.then(response => {
						console.log(response.continuation);
						this.sharedStore.updateSearchResults(response.content, response.continuation, true);
					});
			}
		}
	}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
	.results {
		width: 100%;
		max-width: 500px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		align-items: center;

		.category {
			width: 100%;
		}

		.section-header {
			text-transform: capitalize;
			text-align: left;
			margin: 0;
			padding: 10px;
		}

		.entry-container {
			margin: 0;
		}
	}
</style>