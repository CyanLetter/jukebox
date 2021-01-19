import Vue from "vue";
import VueRouter from "vue-router";
import Queue from "../views/Queue.vue";
import Search from "../views/Search.vue";

Vue.use(VueRouter);

const routes = [
	{
		path: "/",
		name: "Queue",
		component: Queue
	},
	{
		path: "/search",
		name: "Search",
		component: Search
	}
];

const router = new VueRouter({
	routes, 
	mode: 'history'
});

export default router;
