var host = '192.168.178.28'; // the domain or IP where the node server and kurento media server are running

function deviceReady() {
  return new Promise(function(resolve, reject) {
    if (window.cordova) {
      document.addEventListener("deviceready", function() {
        resolve();
      });
    } else {
      resolve();
    }
  });
}

function isDevice(device) {
  return window.device && window.device.platform === device;
}


deviceReady().then(function() {
  if (isDevice('iOS')) {
    cordova.plugins.iosrtc.registerGlobals();
    window.getUserMedia = navigator.getUserMedia.bind(navigator);
  }
  stuff();
});

function stuff() {

  var ws = new WebSocket('ws://'+host+':8080/one2many');
  var videoPresenter, videoViewer;
  var webRtcPeerViewer, webRtcPeerPresenter;

  videoPresenter = document.getElementById('videoPresenter');
  videoViewer = document.getElementById('videoViewer');

  document.getElementById('call').addEventListener('click', function() { presenter(); } );
  document.getElementById('viewer').addEventListener('click', function() { viewer(); } );
  document.getElementById('terminate').addEventListener('click', function() { stop(); } );

  window.onbeforeunload = function() {
    ws.close();
  }

  ws.onmessage = function(message) {
    var parsedMessage = JSON.parse(message.data);

    switch (parsedMessage.id) {
    case 'presenterResponse':
      presenterResponse(parsedMessage);
      break;
    case 'viewerResponse':
      viewerResponse(parsedMessage);
      break;
    case 'stopCommunication':
      dispose();
      break;
    case 'iceCandidatePresenter':
      webRtcPeerPresenter.addIceCandidate(parsedMessage.candidate);
      break;
    case 'iceCandidateViewer':
      webRtcPeerViewer.addIceCandidate(parsedMessage.candidate);
      break;
    default:

    }
  }

  function presenterResponse(message) {
    if (message.response != 'accepted') {
      var errorMsg = message.message ? message.message : 'Unknow error';
      dispose();
    } else {
      webRtcPeerPresenter.processAnswer(message.sdpAnswer);
    }
  }

  function viewerResponse(message) {
    if (message.response != 'accepted') {
      var errorMsg = message.message ? message.message : 'Unknow error';
      dispose();
    } else {
      webRtcPeerViewer.processAnswer(message.sdpAnswer);
    }
  }

  function presenter() {
    if (!webRtcPeerPresenter) {

      var options = {
        localVideo: videoPresenter,
        onicecandidate : onIceCandidatePresenter
      };

      webRtcPeerPresenter = kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, function(error) {
        if(error) return onError(error);

        this.generateOffer(onOfferPresenter);
      });
    }
  }

  function onOfferPresenter(error, offerSdp) {
    if (error) return onError(error);

    var message = {
      id : 'presenter',
      sdpOffer : offerSdp
    };
    sendMessage(message);
  }

  function viewer() {
    if (webRtcPeerViewer) { return; }

    var options = {
      remoteVideo: videoViewer,
      onicecandidate : onIceCandidateViewer
    };

    deviceReady().then(function() {
      /*
      *  We do not have to set connection constraints when we apply PR:
      *  https://github.com/eface2face/cordova-plugin-iosrtc/pull/119
      *  to the cordova-plugin-iosrtc...
      */
      webRtcPeerViewer = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, function(error) {
        if(error) return onError(error);
        this.generateOffer(onOfferViewer);
      });
    });
  }

  function onOfferViewer(error, offerSdp) {
    if (error) return onError(error)

    var message = {
      id : 'viewer',
      sdpOffer : offerSdp
    };
    sendMessage(message);
  }

  function onIceCandidatePresenter(candidate) {
       var message = {
          id : 'onIceCandidatePresenter',
          candidate : candidate
       }
       sendMessage(message);
  }

  function onIceCandidateViewer(candidate) {
    var message = {
      id : 'onIceCandidateViewer',
      candidate : candidate
    }
    sendMessage(message);
  }

  function stop() {
    if (webRtcPeerViewer || webRtcPeerPresenter) {
      var message = {
          id : 'stop'
      }
      sendMessage(message);
      dispose();
    }
    window.location.href = 'index.html';
  }

  function dispose() {
    if (webRtcPeerViewer) {
      webRtcPeerViewer.dispose();
      webRtcPeerViewer = null;
    }
    if (webRtcPeerPresenter) {
      webRtcPeerPresenter.dispose();
      webRtcPeerPresenter = null;
    }
  }

  function sendMessage(message) {
    var jsonMessage = JSON.stringify(message);
    ws.send(jsonMessage);
  }

  function onError(err) {
    console.error(err);
    throw err
  }
}
