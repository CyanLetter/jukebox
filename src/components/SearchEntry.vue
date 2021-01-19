<template>
	<li class="entry" v-on:click="selectEntry">
		{{ entryData.name }}
	</li>
</template>

<script>
	export default {
		name: "SearchEntry",
		props: {
			entryData: Object
		},
		methods: {
			selectEntry() {
				if (this.entryData.type === "song") {
					// add song to queue
					let requestOptions = {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(this.entryData)
					};
					fetch(window.location.protocol + "//" + window.location.hostname + ":6400/api/addToQueue", requestOptions)
						.then(response => response.json())
						.then(data => {
							console.log(data);
						});
						
				} else {
					// pull up information about this album or artists
				}
			}
		}
	};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
	
</style>
