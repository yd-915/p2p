import { useEffect, useRef, useState } from "react";
import reactLogo from "./assets/react.svg";
import "./App.css";
import download from "downloadjs";
import io, { Socket } from "socket.io-client";
import streamSaver from "streamsaver";
import Peer from "simple-peer";
import { generateUsername } from "unique-username-generator";
import { initializeApp } from "firebase/app";
import { generateFromString } from "generate-avatar";
import QRCode from "react-qr-code";
import {
  getFirestore,
  onSnapshot,
  doc as docup,
  collection,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  limit,
} from "firebase/firestore";
function App() {
  var myname = useRef("");
  const [peerUsername, setPeerUsername] = useState("");
  const usersList = useRef([""]);
  const [roomId, setRoomId] = useState("");
  const [docId, setDocId] = useState("");
  const [connection, setConnection] = useState(false);
  const production = true;

  const firebaseConfig = {
    apiKey: "AIzaSyBo0rfvxWk-ONJwxR-9s_p10F4tgHIlt2A",
    authDomain: "p2pfile-a6d84.firebaseapp.com",
    databaseURL:
      "https://p2pfile-a6d84-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "p2pfile-a6d84",
    storageBucket: "p2pfile-a6d84.appspot.com",
    messagingSenderId: "886889178798",
    appId: "1:886889178798:web:5f5a1727a4584040712f3f",
  };
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  var configuration = {
    iceServers: [
      
      { urls: "stun:stun.stunprotocol.org" },
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" }, {
        urls: "stun:relay.metered.ca:80",
      },
      {
        urls: "turn:relay.metered.ca:80",
        username: "74870fb3c3ec1f61f125f81c",
        credential: "8BpwyFdt3grieB05",
      },
      {
        urls: "turn:relay.metered.ca:443",
        username: "74870fb3c3ec1f61f125f81c",
        credential: "8BpwyFdt3grieB05",
      },
      {
        urls: "turn:relay.metered.ca:443?transport=tcp",
        username: "74870fb3c3ec1f61f125f81c",
        credential: "8BpwyFdt3grieB05",
      },
    ],
  };
  const baseURL = production
    ? `https://${window.location.hostname}`
    : "http://192.168.29.21:3001";
  var peerConnection = useRef(new RTCPeerConnection(configuration));
  useEffect(() => {
    const username = generateUsername("-");
    window.document.title = "iP2P - Not Connected";
    if (window.location.pathname !== "/") {
      let p = window.location.pathname.slice(1);
      myname.current = p;
      const btn: any = document.querySelectorAll(".btn");
      btn.forEach((i: any) => {
        i.classList.add("hidden");
      });
      const search: any = document.querySelector(".search");
      search.classList.toggle("hidden");
      document.querySelector(".fileinput")?.classList.add("hidden");

      document.querySelector(".recieve_btn")?.classList.toggle("hidden");
      // Recieve();
    }
    if (window.location.pathname == "/") {
      username ? (myname.current = username) : null;
      document.querySelector(".fileinput")?.classList.remove("hidden");
      createRoom();
    }
  }, []);

  const dataChannel = peerConnection.current.createDataChannel("mydata");
  dataChannel.addEventListener("open", (event) => {});
  var file: any;
  const fileAdd = (e: any) => {
    e.preventDefault();
    file = e.target.files[0];
    console.log(file.arrayBuffer(), "bbufer");
    document.querySelector(".file_name")?.classList.remove("opacity-0");
    let name: any = document.querySelector(".file_name");
    name.innerHTML = file.name;
    // console.log(e.target.files[0]);
  };

  const Sendmsg = (e: any) => {
    e.preventDefault();

    file.arrayBuffer().then((buffer: any) => {
      const chunkSize = 16 * 1024;
      while (buffer.byteLength) {
        const chunk = buffer.slice(0, chunkSize);
        buffer = buffer.slice(chunkSize, buffer.byteLength);
        dataChannel.send(chunk);
      }
      var type = { type: file.type };
      dataChannel.send(type.toString());
      dataChannel.send("completed");
      let name: any = document.querySelector(".toast");
      name.innerHTML = "Transfer Completed ⚡";
      document.querySelector(".toast")?.classList.toggle("completed_animation");
      setTimeout(() => {
        document
          .querySelector(".toast")
          ?.classList.toggle("completed_animation");
      }, 3000);
    });
  };

  async function createRoom() {
    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    console.log(peerConnection.current.localDescription);
    try {
      const docRef = await addDoc(collection(db, "room"), {
        type: "offer",
        offer: JSON.stringify(offer),
        name: myname.current,
      });

      setDocId(docRef.id);
      setRoomId(myname.current);
    } catch (e) {
      console.error("Error adding document: ", e);
    }
    // document.querySelector(".send_btn")?.classList.toggle("hidden");
  }

  const q = query(
    collection(db, "room"),
    limit(1),
    where("name", "==", `${myname.current}_`),
    where("type", "==", "answer")
  );
  onSnapshot(q, (querySnapshot) => {
    querySnapshot.forEach((doc) => {
      peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(JSON.parse(doc.data().offer))
      );
      let candidate = doc.data().candidate;
      // console.log(candidate, "candid on sender");

      peerConnection.current.addIceCandidate(JSON.parse(candidate));
    });
  });

  peerConnection.current.onicecandidate = async (e) => {
    console.log(e, "evnt on ice");
    const roomRef = collection(db, "room");
    const q = query(roomRef, limit(1), where("name", "==", myname.current));
    const queryGet: any = await getDocs(q);
    queryGet.forEach(async (doc: any) => {
      var c = doc.ref._path.segments[1];
      console.log(c);
      const ref = docup(db, "room", c);
      if (e.candidate) {
        const docRef = await updateDoc(ref, {
          candidate: JSON.stringify(e.candidate),
          name: myname.current,
        });
        console.log("Document update: ", docRef);
      }
    });
  };
  peerConnection.current.addEventListener("connectionstatechange", (event) => {
    console.log(event, "sender connection events");
    if (peerConnection.current.connectionState === "connected") {
      setConnection(true);
      window.document.title = "iP2P - Connected!";
      console.log("peers cncted");
      let name: any = document.querySelector(".toast");
      name.innerHTML = "Connected ⚡";
      document.querySelector(".toast")?.classList.toggle("completed_animation");
      setTimeout(() => {
        document
          .querySelector(".toast")
          ?.classList.toggle("completed_animation");
      }, 1000);
    }
  });
  const peerConnection_client = useRef(new RTCPeerConnection(configuration));

  peerConnection_client.current.addEventListener(
    "connectionstatechange",
    (event) => {
      if (peerConnection_client.current.connectionState === "connected") {
        setConnection(true);
        window.document.title = "iP2P - Connected!";
        console.log("peers cncted");
        let name: any = document.querySelector(".toast");
        name.innerHTML = "Connected ⚡";
        document
          .querySelector(".toast")
          ?.classList.toggle("completed_animation");
        setTimeout(() => {
          document
            .querySelector(".toast")
            ?.classList.toggle("completed_animation");
        }, 1000);
      }
    }
  );

  async function Recieve() {
    document.querySelector(".recieve_btn")?.classList.toggle("hidden");
    document.querySelector(".pulsing")?.classList.toggle("hidden");
    let p = window.location.pathname.slice(1);
    const roomRef = collection(db, "room");
    const q = query(roomRef, limit(1), where("name", "==", p));
    const queryGet: any = await getDocs(q);
    queryGet.forEach(async (doc: any) => {
      if (doc.data()) {
        // console.log(doc.data().offer, "doc data");
        peerConnection_client.current.setRemoteDescription(
          new RTCSessionDescription(JSON.parse(doc.data().offer))
        );
        const answer = await peerConnection_client.current.createAnswer();
        await peerConnection_client.current.setLocalDescription(answer);
        console.log(answer, "ans");
        peerConnection_client.current.addEventListener(
          "icecandidate",
          (e: any) => {
            console.log("e reciebver", e);
          }
        );
        try {
          const docRef = await addDoc(collection(db, "room"), {
            type: "answer",
            offer: JSON.stringify(answer),
            name: `${p}_`,
          });
          console.log("Document written with ID: ", docRef.id);
          // setDocId(docRef.id);
        } catch (e) {
          console.error("Error adding document: ", e);
        }
      }
    });

    const quer = query(
      collection(db, "room"),
      limit(2),
      where("name", "==", `${p}`),
      where("type", "==", "offer")
    );
    onSnapshot(quer, (querySnapshot) => {
      querySnapshot.forEach((doc) => {
        let candidate = doc.data().candidate;
        console.log(JSON.parse(candidate), "candid on recievr");
        peerConnection_client.current.addIceCandidate(JSON.parse(candidate));
      });
    });

    const fetch: any = await getDocs(quer);
    fetch.forEach(async (doc: any) => {
      console.log("erererefcwedfe");
      console.log(doc.data());
      let candidate = doc.data().candidate;
      peerConnection_client.current.addIceCandidate(JSON.parse(candidate));
    });
  }

  peerConnection_client.current.onicecandidate = async (e) => {
    let p = window.location.pathname.slice(1);
    console.log(e, "ice event on reciever");
    const roomRef = collection(db, "room");
    const q = query(roomRef, limit(1), where("name", "==", `${p}_`));
    const queryG: any = await getDocs(q);
    queryG.forEach(async (doc: any) => {
      //  console.log(doc.ref._path.segments[6],"nnn");
      var c = doc.ref._path.segments[1];
      console.log(doc.ref._path.segments[1], "nnnn");

      if (e.candidate) {
        const ref = docup(db, "room", c);
        const docRef = await updateDoc(ref, {
          candidate: JSON.stringify(e.candidate),
          name: `${p}_`,
        });
        console.log("Document update: ", docRef);
      }
    });
  };

  peerConnection_client.current.ondatachannel = (e: any) => {
    console.log(e, "data cahnel on client");
    var clientDc: any = e.channel;

    console.log(clientDc, "clientdc");
    const fileChunks: any = [];
    clientDc.addEventListener("message", (e: any) => {
      if (e.data.toString() === "completed") {
        // Once, all the chunks are received, combine them to form a Blob
        const file = new Blob(fileChunks);

        console.log("Received", file);
        // const img:any=document.querySelector(".recieved_img");
        // img.src=URL.createObjectURL(file);
        download(file, "downloaded.jpeg");
        const myFile = new File([file], "image.jpeg", {
          type: "image",
        });

        let name: any = document.querySelector(".toast");
        name.innerHTML = "File recieved ⚡";
        document
          .querySelector(".toast")
          ?.classList.toggle("completed_animation");
        setTimeout(() => {
          document
            .querySelector(".toast")
            ?.classList.toggle("completed_animation");
        }, 10000);

        // window.open(URL.createObjectURL(file));
        // console.log(myFile, "filr");
      } else {
        // Keep appending various file chunks
        fileChunks.push(e.data);
      }

      console.log(e.data, "msg from sendedr");
    });
  };

  function close() {
    var name: any = { name_rem: myname };
  }
  return (
    <div className="home relative bg-b h-screen overflow-hidden  ">
      <div className="text-white toast completed_animation absolute top-3 md:top-[90%]  right-[25%] left-[25%] md:right-10  md:left-[unset] flex items-center justify-center  rounded-[25px] md:rounded-[5px] p-2 py-3 z-[66] text-xs bg-g ">
        Transfer Completed ⚡
      </div>

      <div
        className=" cursor-pointer  q text-white self-center justify-self-end w-6 h-6  bg-gray-400 rounded-full flex justify-center items-center md:mr-6 mr-3"
        onClick={() =>
          document.querySelector(".info")?.classList.remove("hidden")
        }
      >
        ?
      </div>
      <div className="info hidden   backdrop-blur bg-lb  shadow-3xl text-white p-3 py-6  rounded-[10px] break-words md:max-w-[40vw] max-w-[80vw] md:right-5 right-2 md:top-6 top-5 absolute z-[99]">
        <div
          className="flex  absolute top-2 w-4 h-4 justify-center items-center p-0 bg-red-600 rounded-full right-2 z-[999]]  "
          onClick={() =>
            document.querySelector(".info")?.classList.add("hidden")
          }
        ></div>
        <ol className="px-6 text-[.9rem] flex flex-col gap-1">
          <li> 1. Scan the QR Code 🔍</li>

          {/* [ Or just add the name to the end of the URL ]<br /> */}
          <li> 2. Click Recieve 📂</li>
          <li> 3. You're now connected ⚡</li>

          {/* <li>  Choose a file. </li>
        <li>  Hit Send button.</li> */}
        </ol>
        <p className=" px-6 mt-4 text-gray-100 text-xs">
          {" "}
          Can't scan QR Code? Just add the name at the end of the URL 😀{" "}
        </p>
      </div>
      <svg
        className="logo  flex justify-items-start  items-start  self-end md:ml-6 md:mt-6 ml-3 mt-3  md:scale-[.71] scale-[.7] origin-top-left  "
        width="59"
        height="57"
        viewBox="0 0 128 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {connection ? (
          <rect
            x="8.67798"
            width="112.814"
            height="128"
            rx="4"
            fill="#3EF994"
          />
        ) : (
          <rect
            x="8.67798"
            width="112.814"
            height="128"
            rx="4"
            fill="#9CA38F"
          />
        )}
        <path
          opacity="0.8"
          d="M4.33902 8.49121C4.33902 6.28207 6.12988 4.49121 8.33902 4.49121H119.661C121.87 4.49121 123.661 6.28207 123.661 8.49121V104.526C123.661 110.049 119.184 114.526 113.661 114.526H14.339C8.81617 114.526 4.33902 110.049 4.33902 104.526V8.49121Z"
          fill="white"
        />
        {connection ? (
          <rect
            y="8.98254"
            width="128"
            height="119.018"
            rx="4"
            fill="#3EF994"
          />
        ) : (
          <rect
            y="8.98254"
            width="128"
            height="119.018"
            rx="4"
            fill="#9CA38F"
          />
        )}
        {connection ? (
          <rect
            y="8.98254"
            width="128"
            height="119.018"
            rx="4"
            fill="#3EF994"
          />
        ) : (
          <rect
            y="8.98254"
            width="128"
            height="119.018"
            rx="4"
            fill="#9CA38F"
          />
        )}
        <path
          d="M40.9948 99.8066L65.6429 66.1838L81.2224 77.1493L40.9948 99.8066Z"
          fill="white"
        />
        <path
          d="M88.2796 36.3356L63.615 69.9456L48.041 58.9719L88.2796 36.3356Z"
          fill="white"
        />
      </svg>

      {/* <svg className='m-6 md:m-0 row-start-0 row-end-1  col-start-1 col-end-1 w-[min-content]  md:scale-[1]  ' width="59" height="57" viewBox="0 0 59 57" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect x="4" width="52" height="57" rx="4" fill="#3EF994"/>
<path opacity="0.8" d="M2 6C2 3.79086 3.79086 2 6 2H53C55.2091 2 57 3.79086 57 6V41C57 46.5228 52.5228 51 47 51H12C6.47715 51 2 46.5228 2 41V6Z" fill="#ffff"/>
<rect y="4" width="59" height="53" rx="4" fill="#3EF994"/>
<path d="M22.1355 37.1224L27.9873 29.4104L31.6861 31.9255L22.1355 37.1224Z" fill="#ffff"/>
<path d="M33.18 23.6888L26.4775 30.6741L23.0935 27.7491L33.18 23.6888Z" fill="#ffff"/>
<rect width="2.89146" height="7.13322" transform="matrix(0.876629 -0.481167 0.744668 0.667435 24 28.4557)" fill="#fffff"/>
</svg> */}

      <div className="md:ml-6 ml-3 flex-wrap break-words md:items-center md:w-[80%] md:mr-6 h-full md:h-[max-content]  md:self-end justify-between md:justify-start py-4   banner md:text-6xl w-full text-4xl flex flex-col md:flex-row gap-6 md:gap-6 text-gray-200">
        <span className="flex flex-col w-[min-content] break-words">
          {" "}
          iP2P. <br />
          Sharing <br />
          made easy.
        </span>
        {roomId ? (
          <>
            <div className="bg-transparent self-end justify-self-end hidden md:flex  h-[min-content]">
              <QRCode
                size={100}
                style={{}}
                value={`${baseURL}/${roomId}`}
                viewBox={`0 0 100 100`}
              />
            </div>
            <div className="bg-transparent  ml-[-.75rem] self-center justify-self-end md:hidden  h-[min-content]">
              <QRCode
                size={80}
                style={{}}
                value={`${baseURL}/${roomId}`}
                viewBox={`0 0 80 80`}
              />
            </div>
          </>
        ) : null}
      </div>

      <div className="md:justify-self-end justify-self-center   md:bg-transparent   rounded-[35px]  inline-flex items-center gap-1 md:mr-6  md:self-center myname  justify-center  text-white font-mono ">
        {/* {connection ? (
          cc
        ) : (
          <span className="bg-red-500 w-5 justify-self-start rounded-full h-5"></span>
        )} */}
        {/* 
        <span className="inline-flex items-center gap-4"> */}
        <img
          className="w-6 h-6 md:w-8 md:h-8 rounded-full "
          src={`data:image/svg+xml;utf8,${generateFromString(myname.current)}`}
        />
        {myname ? myname.current : ""}
        {/* </span> */}
      </div>
      {/* <img src="" className="recieved_img absolute z-" width="400" height="400" alt="pic" /> */}
      <div className=" md:mr-6 self-start md:self-end w-full  md:justify-self-end controls transition-[1] md:min-w-[450px] lg:max-w-[550px]  min-h-[250px]     bg-lb  text-white flex  items-center  justify-center gap-6 md:gap-2 flex-col md:flex-ro w rounded-t-[35px] md:rounded-[35px]  ">
        <label className="custom-file-upload fileinput   cursor-pointer  justify-center items-center shadow-[1px_1px_20px_-8px_rgba(20,220,220,.51)] bg-lb  text-xl text-white px-5 py-3 rounded-[25px] min-w-[150px]">
          Choose File
          <input
            type="file"
            className="send"
            onChange={(e: any) => fileAdd(e)}
          />
        </label>
        <span className="file_name text-xs text-gray-200 opacity-0">""</span>
        {/* <button
          id="sendButton"
          className="btn shadow-[1px_1px_20px_-15px_rgba(20,220,220,.51)] bg-b text-gray-300 text-2xl  px-5 py-3 rounded-[25px] min-w-[150px] "
          onClick={Sendmsg}
        >
          send msg
        </button> */}
        <button
          className="btn send_btn shadow-[1px_1px_20px_-8px_rgba(20,220,220,.51)] bg-g text-xl text-white px-5 py-3 rounded-[25px] min-w-[150px] "
          onClick={Sendmsg}
        >
          Send
        </button>
        <button
          id="recieve_btn"
          className="btn recieve_btn hidden shadow-[1px_1px_20px_-8px_rgba(20,220,220,.51)] bg-g text-2xl text-white px-5 py-3 rounded-[25px] min-w-[150px] "
          onClick={Recieve}
        >
          Recieve
        </button>

        <div className=" flex  flex-col gap-8 justify-center items-center search text-2xl text-gray-300">
          <div className="hidden pulsing self-center"></div>
        </div>
      </div>

      <div
        style={{
          height: "auto",
          margin: "0 auto",
          maxWidth: 64,
          width: "100%",
        }}
      ></div>

      {/* <span className="hidden md:flex  h-full"></span> */}
      <p className="foot md:absolute md:bottom-[2%]   md:bg-transparent bg-lb w-[100%]  text-center justify-self-end self-center  md:text-xs text-[8px]  text-gray-400">
        Made with ❤️ by amithjayapraban
      </p>
    </div>
  );
}

export default App;
