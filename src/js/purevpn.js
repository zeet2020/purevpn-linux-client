// nmcli = require("nmcli-wrapper");
var _ = require('underscore')
// const spawn = require('child_process').spawn
const exec = require('child_process').exec
const request = require('request')
const cheerio = require('cheerio')
const fs = require('fs')



const context = this

const purevpn_host_list = 'https://support.purevpn.com/vpn-servers'
context.vpn_name = 'purevpn_pptp'
context.vpn_uuid = ''
context.conn_exist = true
context.gw = 'vlus-af1.pointtoserver.com'
context.vpn_data = function () {
  return `refuse-pap = yes, gateway = ${context.gw}, refuse-mschap = yes, refuse-chap = yes, refuse-eap = yes, user = ${context.vpn_user_name}, require-mppe = yes, password-flags = 0`
}

context.command = function (id) {
  switch (id) {
    case 'vpn_up':
      return (['connection', 'up', context.vpn_name])
    case 'vpn_down':
      return (['connection', 'down', context.vpn_name])
    case 'check_if_exist':
      return (['connection', 'show', context.vpn_name])
    case 'create_vpn':
      return (['connection', 'add', 'type', 'vpn', 'con-name', context.vpn_name, 'ifname', '"*"', 'vpn-type', 'pptp'])
    case 'update_password':
      return (['connection', 'modify', context.vpn_name, 'vpn.secrets', 'password=' + context.vpn_secret])
    case 'check_if_active':
      return (['connection', 'show', '--active', context.vpn_name])
    case 'update_gateway':
      return ['c', 'modify', context.vpn_name, '"vpn.data"', '"' + context.vpn_data() + '"']
    default:
      return []
  }
}

context.next = function (x) { console.log(x) }
context.error = function (err) { console.log(err) }
context.completion = function () { }

// context.exec = Rx.Observable.fromCallback(nmcli.execSimple);
context.exec = function (commands, cb) {
  var command = 'nmcli ' + commands.join(' ')

  console.log('executing command : ' + command)
  exec(command, cb)
}

context.run = function () {
  var s = context.exec(context.command['create_vpn'])
  s.map(function (o) {
    return context.exec(context.command['update_password'])
  }).map(function (o) {
    return context.exec(context.command['update_gateway'])
  }).subscribe(
  context.next,
  context.error,
  context.completion)
}

context.fetch_host_list = function (cb) {
  request({ uri: purevpn_host_list,gzip: true }, function (error, response, body) {
    if (error) {
      console.log('failed to fetch list')
    }
    const $ = cheerio.load(body)
    var rows = []

    var items = $('#servers_data > tr')
    for (var i = 0; i < items.length; i++) {
      var tds = $(items[i]).find('td')
      var row = []
      for (var j = 0; j < tds.length; j++) {
        row.push($(tds[j]).html())
      }
      rows.push(row)
    }


    context.settings.set("hosts",rows);  
        cb();
      
    
  })
}

context.direct = function (commands, cb) {
  var command = commands.join(' ')

  console.log('executing command : ' + command)
  exec(command, cb)
}

context.read_hosts = function (cb) {
  
      cb(context.settings.get("hosts"));
   
}

context.read_settings = function (cb) {
   var e = context.settings.get('user_details');
    if (!e) {
      console.log('user settings missing')
    } else {
      var settings = context.settings.get('user_details');
      console.log(settings)
      context.vpn_user_name = settings.vpn_user_name
      context.vpn_secret = settings.vpn_secret
    }

    cb(e)
 
}

context.update_settings = function (json) {
   settings.set("user_details",json);
}
