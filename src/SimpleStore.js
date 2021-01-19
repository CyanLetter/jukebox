export class SimpleStore {
	constructor() {
		this.debug = true;
		this.state = {
			musicQueue: [],
			queueUpdated: Date.now(),
			searchResults: [],
			searchContinuation: null,
			searchType: "all",
			searchResultsUpdated: Date.now()
		};
	}

	updateQueue(newQueue) {
		if (this.debug) {
			console.log("Updating queue...");
		}

		this.state.musicQueue = newQueue;
		this.state.queueUpdated = Date.now();
	}

	updateSearchResults(results, continuation, append = false) {
		if (this.debug) {
			console.log("Updating search results...");
		}

		if (append) {
			// Results are pre-sorted into category arrays,
			// so we need to merge each category individually
			for (let category in this.state.searchResults) {
				this.state.searchResults[category] = this.state.searchResults[category].concat(results[category]);
			}
		} else {
			this.state.searchResults = results;
		}

		if (!continuation) {
			this.state.searchContinuation = null;
		} else {
			this.state.searchContinuation = continuation;
		}
		
		this.state.searchResultsUpdated = Date.now();
	}

	updateSearchType(type) {
		if (this.debug) {
			console.log("Updating search type to ", type);
		}
		this.state.searchType = type;
	}
}