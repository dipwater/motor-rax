/* global wx */

export function redirectTo(options) {
  wx.redirectTo(options);
}

export function navigateTo(options) {
  wx.navigateTo(options);
}

export function navigateBack(options) {
  wx.navigateBack(options);
}

export function getComponentLifecycle({ mount, unmount }) {
  function attached() {
    return mount.apply(this, arguments);
  }

  function detached() {
    return unmount.apply(this, arguments);
  }

  return {
    lifetimes: {
      attached,
      detached,
    },
    // Keep compatibility to wx base library version < 2.2.3
    attached,
    detached,
  };
}

export function getPageLifecycle({ mount, unmount, show, hide }) {
  return {
    onLoad() {
      mount.apply(this, arguments);
    },
    onReady() {}, // noop
    onUnload() {
      unmount.apply(this, arguments);
    },
    onShow() {
      show.apply(this, arguments);
    },
    onHide() {
      hide.apply(this, arguments);
    }
  };
}

export function getComponentBaseConfig() {
  return {
    properties: {
      TAGID: null,
      PARENTID: null,
    },
    options: {
      addGlobalClass: true,
    }
  };
}

export function attachEvent(isPage, config, proxiedMethods) {
  if (isPage) {
    Object.assign(config, proxiedMethods);
  } else {
    config.methods = proxiedMethods;
  }
}

export function updateData(data) {
  this._internal.setData(data);
}
