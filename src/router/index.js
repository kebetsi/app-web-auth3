import Vue from 'vue';
import Router from 'vue-router';
import RegisterUser from '@/components/views/RegisterUser';
import ResetPassword from '@/components/views/ResetPassword';
import Authorization from '@/components/views/Authorization';

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: '/',
      redirect: '/auth',
    },
    {
      path: '/auth',
      name: 'Authorization',
      component: Authorization,
      props: (route) => ({
        permissionsArray: route.query.requestedPermissions,
        appId: route.query.requestingAppId,
      }),
    },
    {
      path: '/register',
      name: 'RegisterUser',
      component: RegisterUser,
    },
    {
      path: '/reset',
      name: 'ResetPassword',
      component: ResetPassword,
      props: (route) => ({
        resetToken: route.query.resetToken,
      }),
    },
  ],
});
