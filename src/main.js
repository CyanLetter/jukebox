import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import { SimpleStore } from "./SimpleStore.js";

window.store = new SimpleStore();

Vue.config.productionTip = false;

new Vue({
	router,
	render: h => h(App)
}).$mount("#app");
