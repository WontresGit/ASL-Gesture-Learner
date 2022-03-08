import "./App.css";
import { Hands, HAND_CONNECTIONS } from "@mediapipe/hands";
import { useEffect, useRef, useState } from "react";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { Camera } from "@mediapipe/camera_utils";
import signs from "./letters";

const edges = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [17, 0],
];

function download(filename, text) {
  var element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(text)
  );
  element.setAttribute("download", filename);

  element.style.display = "none";
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

function dotProduct(a, b) {
  let result = a.x * b.x + a.y * b.y;
  return result;
}

function vCos(pa, pp, pb, pq) {
  const a = { x: pa.x - pp.x, y: pa.y - pp.y };
  const b = { x: pb.x - pq.x, y: pb.y - pq.y };
  return dotProduct(a, b) / (magnitude(a) * magnitude(b));
}

function magnitude(a) {
  return Math.sqrt(a.x * a.x + a.y * a.y);
}

function vectorCos(pa, pb, root) {
  const a = { x: pa.x - root.x, y: pa.y - root.y };
  const b = { x: pb.x - root.x, y: pb.y - root.y };
  return dotProduct(a, b) / (magnitude(a) * magnitude(b));
}

function signMeasure(sign) {
  const result = [];
  function helper(a, b, c) {
    result.push(vectorCos(sign[a], sign[c], sign[b]));
  }

  for (let edgeA of edges) {
    for (let edgeB of edges) {
      if (edgeA[0] === edgeB[0] && edgeA[1] === edgeB[1]) continue;
      result.push(
        vCos(sign[edgeA[0]], sign[edgeA[1]], sign[edgeB[0]], sign[edgeB[1]])
      );
      // if (edgeA.includes(edgeB[0]) || edgeA.includes(edgeB[1])) {
      //   //neighbors
      //   const root = edgeA.includes(edgeB[0]) ? edgeB[0] : edgeB[1];
      //   const pointA = edgeA[0] === root ? edgeA[1] : edgeA[0];
      //   const pointB = edgeA.includes(edgeB[0]) ? edgeB[1] : edgeB[0];
      //   result.push(vectorCos(sign[pointA], sign[pointB], sign[root]));
      // }
    }
  }

  // helper(0, 2, 4);
  // helper(0, 5, 8);
  // helper(0, 9, 12);
  // helper(0, 13, 16);
  // helper(0, 17, 20);
  // helper(8, 5, 17);
  // helper(12, 9, 17);
  // helper(16, 13, 5);
  // helper(20, 17, 5);

  // for (let i = 1; i < sign.length; i++) {
  //   for (let j = 1; j < sign.length; j++) {
  //     result.push(vectorCos(sign[i], sign[j], sign[0]));
  //   }
  // }

  return result;
}

function signCompare(signMade, signTarget) {
  let manhattanDistance = 0;
  const signMadeMeasure = signMeasure(signMade);
  const signTargetMeasure = signMeasure(signTarget);
  for (let i = 0; i < signMadeMeasure.length; i++) {
    manhattanDistance += Math.abs(signMadeMeasure[i] - signTargetMeasure[i]);
  }
  return manhattanDistance;
}

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [currentLandmark, setCurrentLandmark] = useState(null);

  function onClick() {
    //download("ASLSign.json", JSON.stringify(currentLandmark, null, 2));

    for (let i = 0; i < signs.length; i++) {
      const sign = signs[i];
      const letter = String.fromCharCode(65 + i);
      console.log(letter, signCompare(currentLandmark, sign));
    }
  }

  function onResults(results) {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }
    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement.getContext("2d");
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(
      results.image,
      0,
      0,
      canvasElement.width,
      canvasElement.height
    );
    if (results.multiHandLandmarks) {
      const landmarks = results.multiHandLandmarks[0];
      drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
        color: "#00FF00",
        lineWidth: 5,
      });
      drawLandmarks(canvasCtx, landmarks, {
        color: "#FF0000",
        lineWidth: 2,
      });
      setCurrentLandmark(landmarks);

      /*
      for (const landmarks of results.multiHandLandmarks) {
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
          color: "#00FF00",
          lineWidth: 5,
        });
        drawLandmarks(canvasCtx, landmarks, {
          color: "#FF0000",
          lineWidth: 2,
        });
      }
      */
    }
    canvasCtx.restore();
  }

  useEffect(() => {
    const onCPress = (event) => {
      if (event.key === "c") {
        download("ASLSign.json", JSON.stringify(currentLandmark, null, 2));
      }
    };
    document.addEventListener("keydown", onCPress, false);
    return () => {
      document.removeEventListener("keydown", onCPress, false);
    };
  }, [currentLandmark]);

  useEffect(() => {
    if (videoRef.current && canvasRef.current) {
      const videoElement = videoRef.current;
      const canvasElement = canvasRef.current;
      const canvasCtx = canvasElement.getContext("2d");
      const hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        },
      });
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      hands.onResults(onResults);

      const camera = new Camera(videoElement, {
        onFrame: async () => {
          await hands.send({ image: videoElement });
        },
        width: 1280,
        height: 720,
      });
      camera.start();
    }
  }, []);
  return (
    <div className="container">
      <video
        className="input_video"
        ref={videoRef}
        style={{ display: "none" }}
      ></video>
      <canvas
        className="output_canvas"
        width="1280px"
        height="720px"
        ref={canvasRef}
      ></canvas>
      <input
        id="button"
        type="submit"
        name="button"
        value="enter"
        onClick={() => onClick()}
      />
    </div>
  );
}

export default App;
