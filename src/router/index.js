import Vue from 'vue'
import VueRouter from 'vue-router'

import TaskManager from '@/views/TaskManager.vue'

import TaskScheduler from '@/views/TaskScheduler.vue'

Vue.use(VueRouter)

const routes = [
    {
      path: '/',
      redirect: '/scheduler'  // 重定向到任务管理器
    },
    {
      path: '/tasks',
      name: 'TaskManager',
      component: TaskManager
    },
    {
      path: '/scheduler',
      name: 'TaskScheduler',
      component: TaskScheduler
    },
  {
    path: '/about',
    name: 'about',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/AboutView.vue')
  }
]

const router = new VueRouter({
  routes
})

export default router
