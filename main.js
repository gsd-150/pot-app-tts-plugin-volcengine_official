async function tts(text, lang, options = {}) {
  const { config, utils } = options;
  const { http, CryptoJS } = utils;
  const { fetch, Body } = http;

  if (!text || !text.trim()) {
    throw "text is empty";
  }

  const appid = (config.appid || "").trim();
  const accessToken = (config.accessToken || "").trim();
  const cluster = (config.cluster || "").trim();

  if (!appid) throw "appid is required";
  if (!accessToken) throw "accessToken is required";
  if (!cluster) throw "cluster is required";

  let voiceType = config[`${lang}-voiceType`];
  if (!voiceType) {
    voiceType = {
      "zh_cn": "zh_male_xiaoming",
      "zh_tw": "zh_male_xiaoming",
      "en": "en_male_adam",
      "ja": "jp_male_satoshi"
    }[lang];
  }

  if (!voiceType) {
    throw `unsupported language: ${lang}`;
  }

  const speedRatio = parseFloat(config.speedRatio || "1.0");
  const volumeRatio = parseFloat(config.volumeRatio || "1.0");
  const pitchRatio = parseFloat(config.pitchRatio || "1.0");

  const payload = {
    app: {
      appid,
      token: accessToken,
      cluster
    },
    user: {
      uid: "pot-app-user"
    },
    audio: {
      voice_type: voiceType,
      encoding: "mp3",
      rate: 24000,
      speed_ratio: speedRatio,
      volume_ratio: volumeRatio,
      pitch_ratio: pitchRatio
    },
    request: {
      reqid: makeReqId(),
      text,
      text_type: "plain",
      operation: "query",
      silence_duration: 125
    }
  };

  const res = await fetch("https://openspeech.bytedance.com/api/v1/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer; ${accessToken}`
    },
    body: Body.json(payload)
  });

  if (!res.ok) {
    throw `Http Request Error
Http Status: ${res.status}
${JSON.stringify(res.data)}`;
  }

  const result = res.data;

  if (!result) {
    throw "empty response";
  }

  if (result.code !== 3000) {
    throw `TTS Error
Code: ${result.code}
Message: ${result.message || "unknown error"}
Response: ${JSON.stringify(result)}`;
  }

  if (!result.data) {
    throw `No audio data returned
${JSON.stringify(result)}`;
  }

  return base64ToBytes(result.data, CryptoJS);
}

function base64ToBytes(base64, CryptoJS) {
  const data = CryptoJS.enc.Base64.parse(base64);
  const bytes = [];

  for (let i = 0; i < data.sigBytes; i++) {
    const byte = (data.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    bytes.push(byte);
  }

  return bytes;
}

function makeReqId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : ((r & 0x3) | 0x8);
    return v.toString(16);
  });
}
