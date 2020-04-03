import { shallowMount } from '@vue/test-utils';
import Permissions from '@/components/views/bits/Permissions';
import Context from '../../../../src/context';
import Vue from 'vue';
import Vuetify from 'vuetify';

Vue.use(Vuetify);

describe('Permissions.test.js', () => {
  let wrapper;
  const appId = 'testApp';
  const permissions = [
    {name: 'Diary', level: 'read'},
    {defaultName: 'Work', level: 'manage'},
  ];

  beforeAll(async () => {
    const context = new Context({});
    await context.init();
    context.checkAppResult.checkedPermissions = permissions;
    context.accessState = {
      requestedPermissions: permissions,
      requestingAppId: appId,
    };
    wrapper = shallowMount(Permissions, {
      propsData: {
        ctx: context,
        accept: () => {},
        refuse: () => {},
      },
    });
  });

  it('renders correctly (snapshots matching)', () => {
    expect(wrapper.element).toMatchSnapshot();
  });

  it('shows the id of the requesting app', () => {
    const appIdText = wrapper.find('#appIdText');
    expect(appIdText.html()).toContain(`App <b>${appId}</b> is requesting :`);
  });

  it('shows a list of all requested permissions', () => {
    const list = wrapper.find('ul').html();
    expect(list).toContain(`A permission on stream <b>Diary</b> with level <b>READ</b></li>`);
    expect(list).toContain(`A permission on stream <b>Work</b> with level <b>MANAGE</b></li>`);
  });
});
