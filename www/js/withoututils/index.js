var host = '192.168.178.52'; // the domain or IP where the node server and kurento media server are running

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
  navigator.getUserMedia = navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia;
  if (isDevice('iOS')) {
    cordova.plugins.iosrtc.registerGlobals();
    window.getUserMedia = navigator.getUserMedia.bind(navigator);
  }
  stuff();
});

function stuff() {

  var ws = new WebSocket('ws://'+host+':8080/one2many');
  var videoPresenter, videoViewer;
  var webRtcPeerViewer, webRtcPeerPresenter, PresenterMediaStream, ViewerMediaStream;
  var readyPresenter = false;
  var readyViewer = false;
  var queuePresenter = [];
  var queueViewer = [];

  videoPresenter = document.getElementById('videoPresenter');
  videoViewer = document.getElementById('videoViewer');

  document.getElementById('call').addEventListener('click', function() { presenter(); } );
  document.getElementById('viewer').addEventListener('click', function() { viewer(); } );
  document.getElementById('terminate').addEventListener('click', function() { stop(); } );

  window.onbeforeunload = function() {
    ws.close();
  }

  function sendPresenterQueue() {
    queuePresenter = queuePresenter.filter(function(candidate) {
      webRtcPeerPresenter.addIceCandidate(new RTCIceCandidate(candidate))
    })
  }

  function sendViewerQueue() {
    queueViewer = queueViewer.filter(function(candidate) {
      webRtcPeerViewer.addIceCandidate(new RTCIceCandidate(candidate))
    })
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
      queuePresenter.push(parsedMessage.candidate)
      if (readyPresenter) {
        sendPresenterQueue()
      }
      break;
    case 'iceCandidateViewer':
      queueViewer.push(parsedMessage.candidate)
      if (readyViewer) {
        sendViewerQueue()
      }
      break;
    default:

    }
  }

  function presenterResponse(message) {
    if (message.response != 'accepted') {
      var errorMsg = message.message ? message.message : 'Unknow error';
      dispose();
    } else {
      webRtcPeerPresenter.setRemoteDescription(new RTCSessionDescription({
        type: 'answer',
        sdp: message.sdpAnswer
      }), function() {
        sendPresenterQueue()
        readyPresenter = true
      }, onError)
    }
  }

  function viewerResponse(message) {
    if (message.response != 'accepted') {
      var errorMsg = message.message ? message.message : 'Unknow error';
      dispose();
    } else {
      webRtcPeerViewer.setRemoteDescription(new RTCSessionDescription({
        type: 'answer',
        sdp: message.sdpAnswer
      }), function () {
        sendViewerQueue()
        readyViewer = true
        var stream = webRtcPeerViewer.getRemoteStreams()[0]
        ViewerMediaStream = stream;
        var url = URL.createObjectURL(stream)
        videoViewer.src = url
      }, onError)
    }
  }

  function presenter() {
    if (!webRtcPeerPresenter) {
      webRtcPeerPresenter = new RTCPeerConnection()
      webRtcPeerPresenter.addEventListener('icecandidate', function(event) {
        if (event.candidate) {
          onIceCandidatePresenter(event.candidate);
        }
      })
      navigator.getUserMedia({
        audio: true,
        video: true
      }, function(stream) {
        PresenterMediaStream = stream;
        webRtcPeerPresenter.addStream(stream);
        videoPresenter.muted = true;
        videoPresenter.src = URL.createObjectURL(stream);
        createOffer(webRtcPeerPresenter).then(function(offer) {
          onOfferPresenter('', offer.sdp);
        })
      }, onError)
    }
  }

  function createOffer(pc, constraints) {
    return new Promise(function(resolve, reject) {
      pc.createOffer(function(offer) {
        pc.setLocalDescription(new RTCSessionDescription(offer), function() {
          resolve(offer)
        }, reject)
      }, reject, constraints)
    })
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

    webRtcPeerViewer = new RTCPeerConnection()
    webRtcPeerViewer.addEventListener('icecandidate', function(event) {
      if (event.candidate) {
        onIceCandidateViewer(event.candidate);
      }
    })

    createOffer(webRtcPeerViewer, {
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    }).then(function(offer) {
      onOfferViewer('', offer.sdp);
    })
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
      ViewerMediaStream.getTracks().forEach(function (track) {
        track.stop();
      });
      webRtcPeerViewer.close();
      ViewerMediaStream = null;
      webRtcPeerViewer = null;
    }
    if (webRtcPeerPresenter) {
      PresenterMediaStream.getTracks().forEach(function (track) {
        track.stop();
      });
      webRtcPeerPresenter.close();
      PresenterMediaStream = null;
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
