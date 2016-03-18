# Kurento One2Many iOS Demo

Adapted from [Kurento's One2Many Demo](https://github.com/Kurento/kurento-tutorial-node/tree/master/kurento-one2many-call)
And adapted from [m59peacemaker](https://github.com/m59peacemaker/kurento-one2many-iOS)

Start [Kurento Media Server](https://www.kurento.org/docs/current/installation_guide.html) on port 8888 (default).

Enter ./server and run `npm install` then start the server with `node server`. If necessary change the WS URI to Kurento installation in `server.js`.

Open ./www/index.js and set line 1 `var host = ` to the ip/domain where kms and the node server are running.

### Test in browser

Serve ./www/index.html

```sh
cd www
live-server --port=8081
```

Visit localhost:8081 in a browser. And choose if you want to test with the kurento-utils library or without it.

### Test on iOS device

Connect your iOS device to the Apple computer.

```sh
npm install xcode -g (globally or locally)
cordova platform add ios
cordova run ios --device
```

[This is the Dockerfile I use](http://pastebin.com/3ih5cqA2) for Kurento Media Server. I run it with --net=host to make things easier.

### Problem to tackle

If you have everything up and running. You'll notice that:

* Being a presenter on iOS and a viewer in Firefox does work
* Being a presenter on Firefox and a viewer in iOS does work
* Being a presenter on Firefox and a viewer in Firefox does work
* Being a presenter on iOS and a viewer in iOS does NOT work

It does not matter if you use kurento-utils library or you don't both give the same issue.
Hopefully someone can tackle this issue.
