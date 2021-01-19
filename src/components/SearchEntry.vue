<template>
	<li class="entry" v-on:click="selectEntry">
		<img :src="entryData.thumbnail.url">
		<p>
			{{ entryData.name }}
		</p>
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
	.entry {
		display: flex;
		align-items: center;
		width: 100%;

		padding: 3px;
		border-bottom: 1px solid #333;
		cursor: pointer;
		transition: 0.2s;

		&:hover {
			transition: 0s;
			background: #ccc;
		}

		&:first-child {
			border-top: 1px solid #333;
		}

		img {
			height: 40px;
			margin-right: 20px;
		}

		p {
			margin: 0;
		}
	}
</style>
