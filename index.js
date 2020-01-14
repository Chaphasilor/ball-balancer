const cv = require('opencv4nodejs');
const dgram = require('dgram');
// const app = require('./app');
// const socket = app.settings.wss;

var udpSocket = dgram.createSocket('udp4');
udpSocket.connect(8888, '192.168.2.102', () => console.log('UDP connected!'));

var frame = null;
const probe = {
  color: [0, 0, 0],
  setColor: (x, y) => {
    this.color = frame.atRaw(y, x);
    console.log(this.color);
  },
}

const devicePort = 0;
const wCap = new cv.VideoCapture(devicePort);

console.log(wCap);

// segmenting by skin color (has to be adjusted)
const redUpper = hue => new cv.Vec(hue/2, 1 * 255, 1 * 255);
const redLower = hue => new cv.Vec(hue/2, 0.8 * 255, 0.4 * 255);
// const skinColorUpper = hue => new cv.Vec(hue, 0.8 * 255, 0.6 * 255);
// const skinColorLower = hue => new cv.Vec(hue, 0.1 * 255, 0.05 * 255);

var counter = 0;

const trackBall = (oldFrame, modifyInput = false, locationFrame = null) => {

  const img = oldFrame.copy();
  // filter by skin color
  const imgHLS = img.cvtColor(cv.COLOR_RGB2HSV);
  
  // if (counter > 350*2) {
  //   counter = 0;
  // }
  // startHue = Math.round(counter/2);
  // console.log('startHue:', startHue);
  // const rangeMask = imgHLS.inRange(skinColorLower(startHue), skinColorUpper(startHue+10));
  // counter++;
  const rangeMask = imgHLS.inRange(redLower(220), redUpper(250));
  // const rangeMask = imgHLS.inRange(skinColorLower(250), skinColorUpper(360));
  // const rangeMask = imgHLS.inRange(skinColorUpper(0), skinColorLower(30));

  // remove noise
  const blurred = rangeMask.blur(new cv.Size(10, 10));
  // const thresholded = rangeMask.threshold(
  //   220,
  //   255,
  //   cv.THRESH_BINARY
  // );


  const contours = blurred.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
  // console.log('contours:', contours);
  if (contours.length > 0) {
    let largestContour = contours.reduce((largest, current) => {
      return largest.area < current.area ? current : largest;
    }, {area: 0})
    // let largestContour = contours[0];
    if (largestContour != null) {

      let x, y = 0;
      if (largestContour.boundingRect) {
        
        let boundingRect = largestContour.boundingRect();
      // console.log('largestContour:', largestContour);
      // console.log('largestContour.boundingRect():', largestContour.boundingRect());
      x = boundingRect.x + Math.round(boundingRect.width/2);
      y = boundingRect.y + Math.round(boundingRect.height/2);
      // console.log('x: '+ x + ', y: ' +  y);
      
      let message = Buffer.from('X:'+Math.round(((x/blurred.cols)+1.0)*1000)+',Y:'+Math.round(((y/blurred.rows)+1.0)*1000));
      // udpSocket.send(message, 0, message.length, 8888, '192.168.2.102', (err, bytes) => {
      // udpSocket.send(message, 0, message.length, 3333, '127.0.0.1', (err, bytes) => {
      udpSocket.send(message, 0, message.length, (err, bytes) => {
        if (err) {
          console.error('UDP Error:', err);
        }
        // console.log('Message with '+bytes+' bytes sent!');
        return blurred;
        // udpSocket.close();
      });

      if (!modifyInput) {
        blurred.set(y, x, [255]);
        // console.log('blurred:', blurred);
        // let bounded = blurred.drawRectangle(largestContour.boundingRect(), new cv.Vec(110, 255, 255), 5);
      } else {
        if (locationFrame != null) {
          locationFrame.set(y, x, [0, 255, 0]);
        } else {
          oldFrame.set(y, x, [255]);
        }
        // modifies the actual input
        oldFrame.drawRectangle(boundingRect, new cv.Vec(0, 255, 0), 5);
      }
        
      }
      
    }
  } else {
    return blurred;
  }

  return blurred;
};

function modifyFrame(oldFrame) {

  const frame = oldFrame.copy();
  //  frame = frame.cvtColor(cv.COLOR_BGR2HLS);

  const probeLocation = [200, 300]
  const probeSize = 10;
  
  let regionArr = frame.getRegion(new cv.Rect(probeLocation[0], probeLocation[1], probeSize, probeSize)).getDataAsArray();
  for (let i in regionArr) {
    for (let j in regionArr) {
      // console.log('i:', i);
      // console.log('j:', j);
      // console.log('probeLocation[0]+(25-i):', probeLocation[0]+(Math.round(25/2-i)));
      frame.set(probeLocation[0]+(Math.round(probeSize/2-i)), probeLocation[1]+(Math.round(probeSize/2-j)), [0, 0, 255]);
    }
  }
  frame.set(probeLocation[0], probeLocation[1], [0, 255, 0]);
  
  return frame.mul(1);
  
}

function sleep(ms) {
  return new Promise((resolve, reject) => {
  
    setTimeout(resolve(), ms);
  
  })
}

async function track(socket) {
  return new Promise(async (resolve, reject) => {

    socket.on('connection', function connection(ws) {

      console.log('WS connected');
  
      ws.on('message', function incoming(message) {
    
        console.log('incoming');
        probe.setColor(200, 300);
    
        console.log("Received message: ", message);
        
        socket.clients.forEach(client => {
          // if (client != ws) {
          //     client.send('New notification: ' + message);
          // }    
          client.send('New notification: ' + message);
        });
    
        // ws.send("Received message: " + message);
      });
    
      
    });
  
    // loop through the capture
    const delay = 1;
    let done = false;
    while (!done) {
    // for (let i = 0; i < 50; i++) {
      frame = await wCap.readAsync();
      // loop back to start on end of stream reached
      if (frame.empty) {
        wCap.reset();
        frame = wCap.read();
      }

      // console.log('frame: ', frame);
      let location = new cv.Mat(frame.rows, frame.cols, cv.CV_8UC3, [0, 0, 0]);
      let masked = trackBall(frame, true, location);
      cv.imshow('frame', frame);
      // cv.imshow('masked', masked);
      // cv.imshow('location', location);
      // cv.imshow('modified', modified);
      // cv.waitKey();

      // socket.clients.forEach(client => {
      //   client.send(JSON.stringify(frame.getDataAsArray()));
      //   client.send('test2');
      // });
      const key = cv.waitKey(delay);
      // done = key !== 255;
    }
  
  })
}

module.exports.track = track;
module.exports.setColor = probe.setColor;