// @flow

import axios from 'axios';
import Hostings from './Hostings.js';
import type {AuthState} from './AuthStates.js';
import type {PermissionsList} from './Permissions.js';

const url = require('url');

type AppAccess = {
  type: 'app',
  permissions: PermissionsList,
  expires: ?number,
  token: string,
};

type AppCheck = {
  permissions: PermissionsList,
  match: AppAccess,
  mismatch: AppAccess,
};

export type NewUser = {
  username: string,
  server: string,
};

export type ServiceInfos = {
  version: string,
  register: string,
  access: string,
  api: string,
  name: string,
  home: string,
  support: string,
  terms: string,
}

class Pryv {
  core: (string, ?string) => string;
  init: () => Promise<void>;
  serviceInfoUrl: string;
  register: string;
  apiUrl: string;

  constructor (serviceInfoUrl: string) {
    this.serviceInfoUrl = serviceInfoUrl;

    this.core = function (username: string, path: ?string) {
      if (this.apiUrl == null) {
        console.error('apiUrl url is not set yet, call \'init()\' and wait for service info to be loaded');
        return '';
      }
      path = path || '';
      return url.resolve(this.apiUrl.replace('{username}', username), path);
    };
  }

  async init () {
    console.log('Pryv init');
    const res = await this.getServiceInfo();

    this.apiUrl = res.api;
    this.register = res.register;
    console.log('service info fetched. api = ' + this.apiUrl + ' / reg = ' + this.register);
  }

  // ---------- AUTH calls ----------

  // GET/reg: polling with according poll key
  async poll (pollKey: string): Promise<AuthState> {
    if (this.register == null) {
      return Promise.reject(new Error('register url is not set yet, call \'init()\' and wait for service info to be loaded'));
    }
    const res = await axios.get(url.resolve(this.register, 'access/' + pollKey));
    return res.data;
  }

  // POST/reg: advertise updated auth state
  async updateAuthState (pollKey: string, authState: AuthState): Promise<number> {
    if (this.register == null) {
      return Promise.reject(new Error('register url is not set yet, call \'init()\' and wait for service info to be loaded'));
    }
    const res = await axios.post(
      url.resolve(this.register, 'access/' + pollKey),
      authState
    );
    return res.status;
  }

  // POST/core: login with Pryv credentials
  async login (username: string, password: string, appId: string): Promise<string> {
    const res = await axios.post(
      this.core(username, 'auth/login'), {
        username: username,
        password: password,
        appId: appId,
      },
    );
    return res.data.token;
  }

  // POST/core: check if requested app access already exists or not,
  // answering with one of the three:
  // 1. checkedPermissions: corrected permissions if the access does not exists yet
  // 2. match: existing access with matching permissions
  // 3. mismatch: existing access with mismatching permissions
  async checkAppAccess (username: string, permissions: PermissionsList,
    personalToken: string, appId: string, deviceName: ?string): Promise<AppCheck> {
    const res = await axios.post(
      this.core(username, 'accesses/check-app'), {
        requestingAppId: appId,
        requestedPermissions: permissions,
        deviceName: deviceName,
      }, {
        headers: { Authorization: personalToken },
      }
    );
    const data = res.data;
    return {
      permissions: data.checkedPermissions,
      match: data.matchingAccess,
      mismatch: data.mismatchingAccess,
    };
  }

  // POST/core: create a new app access, returns the according app token
  async createAppAccess (username: string, personalToken: string,
    permissions: PermissionsList, appId: string,
    clientData: ?{}, appToken: ?string, expireAfter: ?number): Promise<AppAccess> {
    const res = await axios.post(
      this.core(username, 'accesses'), {
        name: appId,
        type: 'app',
        permissions: permissions,
        token: appToken,
        expireAfter: expireAfter,
        clientData: clientData,
      }, {
        headers: { Authorization: personalToken },
      }
    );
    return res.data.access;
  }

  // PUT/core: update an existing app access, returns the according app token
  async updateAppAccess (accessId: string, username: string, personalToken: string,
    permissions: PermissionsList, appId: string,
    clientData: ?{}, appToken: ?string, expireAfter: ?number): Promise<AppAccess> {
    const res = await axios.put(
      this.core(username, 'accesses/' + accessId), {
        name: appId,
        type: 'app',
        permissions: permissions,
        token: appToken,
        expireAfter: expireAfter,
        clientData: clientData,
      }, {
        headers: { Authorization: personalToken },
      }
    );
    return res.data.access;
  }

  // ---------- REGISTER calls ----------

  // GET/reg: retrieve all available Pryv hostings
  async getAvailableHostings (): Promise<Hostings> {
    if (this.register == null) {
      return Promise.reject(new Error('register url is not set yet, call \'init()\' and wait for service info to be loaded'));
    }
    const res = await axios.get(url.resolve(this.register, 'hostings'));
    return new Hostings(res.data);
  }

  // POST/reg: create a new Pryv user
  async createUser (username: string, password: string, email: string,
    hosting: string, lang: string, appId: string,
    invitation: ?string, referer: ?string): Promise<NewUser> {
    if (this.register == null) {
      return Promise.reject(new Error('register url is not set yet, call \'init()\' and wait for service info to be loaded'));
    }
    const res = await axios.post(
      url.resolve(this.register, 'user'), {
        appid: appId,
        username: username,
        password: password,
        email: email,
        hosting: hosting,
        languageCode: lang || 'en',
        invitationtoken: invitation || 'enjoy',
        referer: referer,
      }
    );
    return res.data;
  }

  async checkUsernameExistence (username: string): Promise<string> {
    if (this.register == null) {
      return Promise.reject(new Error('register url is not set yet, call \'init()\' and wait for service info to be loaded'));
    }
    const res = await axios.post(url.resolve(this.register, username + '/server'));
    return res.server;
  }

  // GET/reg: convert email to Pryv username
  async getUsernameForEmail (usernameOrEmail: string): Promise<string> {
    if (usernameOrEmail.search('@') < 0) {
      return usernameOrEmail;
    }
    if (this.register == null) {
      return Promise.reject(new Error('register url is not set yet, call \'init()\' and wait for service info to be loaded'));
    }
    const res = await axios.get(url.resolve(this.register, usernameOrEmail + '/uid'));
    return res.data.uid;
  }

  // ---------- RESET calls ----------

  // POST/core: request a password reset
  async requestPasswordReset (username: string, appId: string): Promise<number> {
    const res = await axios.post(
      this.core(username, 'account/request-password-reset'), {
        appId: appId,
        username: username,
      }
    );
    return res.status;
  }

  // POST/core: change Pryv password using a reset token
  async changePassword (username: string, newPassword: string,
    resetToken: string, appId: string): Promise<number> {
    const res = await axios.post(
      this.core(username, 'account/reset-password'), {
        username: username,
        newPassword: newPassword,
        appId: appId,
        resetToken: resetToken,
      }
    );
    return res.status;
  }

  // ---------- UTILS calls ----------

  // GET/reg: retrieve service information
  async getServiceInfo (): Promise<ServiceInfos> {
    const res = await axios.get(this.serviceInfoUrl);
    return res.data;
  }
}

export default Pryv;
