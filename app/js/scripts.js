/* global Backbone $ _ */
/*eslint camelcase: "error"*/
// Empty JS for your own code to be here

const e = require('electron')
const app_path = e.remote.app.getAppPath()
console.log(app_path);
const vpn = require('./js/purevpn.js')
const jetpack = require('fs-jetpack');
const settings = require('electron-settings');
vpn.settings = settings;



var hosts = settings.get("hosts");
const App = {
  view: {},
  model: {},
  collection: {},
  vent: _.extend({}, Backbone.Events)

}

// simple model
App.model.host = Backbone.Model.extend({})

// simple collection
App.collection.hosts = Backbone.Collection.extend({
  model: App.model.host
})

//
App.view.AppLayout = Backbone.View.extend({
  el: '.container-fluid',
  events: {
    'click #refresh': 'refresh_host_list',
    'click #fetch_host_list': 'fetch_host_list',
    'click #actions': 'actions'
  },
  actions: function (e) {
    if (vpn.isconnected) {
      $.notify("can't modify the settings while connected to vpn", {type: 'danger'})
      e.preventDefault()
      e.stopPropagation()
    }
  },
  fetch_host_list: function () {
    vpn.fetch_host_list(() => {
      vpn.read_hosts((updated_list) => {
        hosts = updated_list
        this.refresh_host_list()
      })
    })
  },
  refresh_host_list: function () {
    if (this.hostlistView) {
      this.hostlistView.closeCleanly()
    }

    var md_hosts = _.map(hosts, function (arr) {
      return _.object(['region name', 'country', 'city', 'pptp', 'openvpn-udp', 'openvpn-tcp'], arr)
    })
    var host_collection = new App.collection.hosts(md_hosts)
    this.hostlistView = new App.view.hostList({collection: host_collection})
    this.hostlistView.render()
  },
  initialize: function () {
    this.settings = new App.view.settingView()
    vpn.read_settings((e, d) => {
      this.connect_button = new App.view.ConnectButton()
      if (this.connect_button.validate_details()) {
        if (hosts.length > 0) {
          this.refresh_host_list()
        } else {
          this.fetch_host_list()
        }
      } else {
        this.settings.show()
      }
    })
    window.onbeforeunload = () => { // close vpn if the window is closed
      this.connect_button.disconnect_vpn()
    }
    e.remote.app.on('focus', () => { // close vpn if the window is closed
      this.connect_button.state_checker()
    })
  }

})

App.view.ConnectButton = Backbone.View.extend({
  el: '#connect-button-area',
  events: {
    'click #connect-vpn': 'connect_vpn',
    'click #disconnect-vpn': 'disconnect_vpn'
  },
  initialize: function () {
     // check if the connection is up
    this.connected = false
    this.state = $.Deferred()
    this.state_checker()
  },
  validate_details: function () {
    if (!vpn.vpn_user_name || vpn.vpn_user_name.length === 0) {
      return false
    }
    if (!vpn.vpn_secret || vpn.vpn_secret.length === 0) {
         // show_settings_modal()
      return false
    }
    return true
  },
  state_checker: function () {
    vpn.exec(vpn.command('check_if_active'), (e, s) => {
      // console.log('worked')
      if (e) {
        this.state.reject()
      } else {
        if (s.length === 0) {
          this.state.reject()
        } else {
          this.state.resolve()
               // this.connected = true;
        }
      }
    })

    this.state.then((e, r) => {
      this.$el.find('#connect-vpn').hide()
      this.$el.find('#disconnect-vpn').show()
    })
  },
  updated_connected_host: function (connected) {
    if (connected) {
      let text = `Connected to: <b>${vpn.selected_model.get('city')}, ${vpn.selected_model.get('country')}</b> Gateway: <b>${vpn.gw}</b>`
      this.$el.find('#connected_host').html(text)
      this.$el.find('#connected_host').css({'font-size': 'large', 'padding-top': '10px'})
    } else {
      this.$el.find('#connected_host').html('---')
    }
  },
  disconnect_vpn: function () {
    vpn.exec(vpn.command('vpn_down'), (err, succ) => {
      if (err) {
        $.notify(err, {type: 'danger'})
      } else {
        this.updated_connected_host(false)
        $.notify(succ, {type: 'success'})
        vpn.isconnected = false
        $('#connect-vpn').show()
        $('#disconnect-vpn').hide()
      }
    })
  },
  connect_vpn: function () {
    var up_gw = $.Deferred()
    var up_pass = $.Deferred()
    vpn.exec(vpn.command('update_gateway'), function (err, succ) {
      if (!err) {
        up_gw.resolve()
        $.notify('updated the gateway', {type: 'success'})
      } else {
        up.gw.reject()
      }
    })

    up_gw.then(function () {
      vpn.exec(vpn.command('update_password'), function (e, s) {
        if (e) {
          up_pass.reject()
        }
        up_pass.resolve()
      })

      return up_pass
    }).then(() => {
      vpn.exec(vpn.command('vpn_up'), (e, s) => {
        // console.log(e);
        if (e) {
          $.notify(e, {type: 'danger'})
          this.updated_connected_host(false)
        } else {
          $.notify(s, {type: 'success'})
          vpn.isconnected = true
          this.updated_connected_host(true)
          $('#connect-vpn').hide()
          $('#disconnect-vpn').show()
        }
      })
    })
  }
})

App.view.settingView = Backbone.View.extend({
  el: '#settings',
  initialize: function () {
    this.$el.on('shown.bs.modal', function () {
      $('#username').val(vpn.vpn_user_name)
      $('#password').val(vpn.vpn_secret)
    })
  },
  show: function () {
    this.$el.modal('show')
  },
  hide: function () {
    this.$el.modal('hide')
  },
  close_setting: function (e) {
    if ($('#username').val().trim().length === 0) {
      e.preventDefault()
      $.notify('need to enter a valid purevpn username', {type: 'danger'})
      return false
    }
    if ($('#password').val().trim().length === 0) {
      e.preventDefault()
      $.notify('need to enter a valid password', {type: 'danger'})
      return false
    }
    this.hide()
  },
  events: {
    'click #save-settings': 'save_settings',
    'click .close-model': 'close_setting'
  },
  save_settings: function () {
    let obj = {'vpn_user_name': $('#username').val(), 'vpn_secret': $('#password').val() }
    vpn.update_settings(obj)
    vpn.vpn_user_name = $('#username').val()
    vpn.vpn_secret = $('#password').val()
    this.hide()
    App.vent.trigger('settings-updated')
  }

})

App.view.hostListItem = Backbone.View.extend({
  tagName: 'tr',
  initialize: function () {
    this.model.on('change', _.bind(this.render, this))
  },
  events: {
    'click #host_selected': 'change_host'
  },
  change_host: function (e) {
    if (vpn.isconnected) {
      $.notify("can't modify the settings while connected to vpn", {type: 'danger'})
      e.preventDefault()
      e.stopPropagation()
    }
    vpn.gw = e.target.dataset['host']
    vpn.selected_model = this.model
  },
  addCheckbox: function () {
    let input = $('<input/>')
    input.attr('type', 'radio')
    input.attr('name', 'pptp_host')
    input.attr('id', 'host_selected')
    input.attr('data-host', this.model.get('pptp'))
    input.attr('data-city', this.model.get('city'))

    this.$el.prepend($('<td/>').append(input))
  },
  render: function () {
    this.$el.empty()
    this.addCheckbox()
    _.each(['country', 'city', 'pptp', 'resp'], (i) => {
      this.$el.append((new App.view.hostListItemCell({
        model: (new Backbone.Model({value: this.model.get(i)}))

      })).render().el)
    })

    return this
  }

})

App.view.hostListItemCell = Backbone.View.extend({
  tagName: 'td',
  render () {
    this.$el.append(this.model.get('value'))
    return this
  }
})

App.view.hostList = Backbone.View.extend({
  el: '#host_list',
  attachTo: 'tbody',
  events: {
    'click #sort_response': 'sort_response'
  },
  triggerPing: function (model, host) {
    let self = this
    vpn.direct(['ping', '-c', '1', '-w', '1', host], function (e, s) {
      if (e) {
        model.set('resp', 99999)
      } else {
        if (s.match(/time=([\d]+) ms/)) {
          model.set('resp', 1 * (s.match(/time=([\d]+) ms/)[1]))
        }
      }
    })
  },
  initialize: function () {
    this.collection.each((m) => {
      m.get('pptp') && this.triggerPing(m, m.get('pptp'))
    })
    this.collection.on('sort', _.bind(this.render, this))
  },
  sort_response: function () {
    this.collection.comparator = function (model) {
      return model.get('resp')
    }
    this.collection.sort()
  },
  closeCleanly: function () {
    _.each(this.children, (c) => {
      c.$el.empty()
      c.unbind()
      c.model.destroy()
      console.log('closing the view')
    })
  },
  render: function () {
    this.children = []
    this.$el.find(this.attachTo).empty()
    this.collection.each((m) => {
      let item = new App.view.hostListItem({model: m})
      this.children.push(item)
      this.$el.find(this.attachTo).append(item.render().el)
    })

    return this
  }

})

// start up code for application

$(function () {
  vpn.exec(vpn.command('check_if_exist'), (e, r) => {
    if (e) {
      $.notify('vpn was not found', {type: 'danger'})
      $.notify('trying to create vpn', {type: 'success'})
      vpn.exec(vpn.command('create_vpn'), function (e, r) {
        if (e) {
          $.notify('failed to create vpn', {type: 'danger'})
        } else {
          $.notify('vpn created successfully', {type: 'success'})
          startup()
        }
      })
    } else {
      startup()
    }
  })

  function startup () {
    var layout = new App.view.AppLayout()
    App.vent.on('settings-updated', () => {
      if(!hosts){
         layout.fetch_host_list();
      } else {
         layout.refresh_host_list();
      }
      
    })
  };
})
