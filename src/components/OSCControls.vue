<template>
	<div class="control-group">
		<button type="button" v-on:click="setPalette(0)">Supernova</button>
		<button type="button" v-on:click="setPalette(1)">Electrowave</button>
	</div>
</template>

<script>
	export default {
		name: "OSCControls",
		props: {
			
		},
		methods: {
			setPalette(index) {
				let requestOptions = {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						address: "/palette/index",
						message: [
							{
								type: "i",
								value: index
							}
						]
					})
				};
				fetch(window.location.protocol + "//" + window.location.hostname + ":6400/api/controls/osc", requestOptions)
					.then(response => response.json())
					.then(response => {
						console.log(response);
					});
			}
		}
	};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
	
</style>
