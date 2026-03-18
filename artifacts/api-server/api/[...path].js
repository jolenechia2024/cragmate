import mod from "../dist/app.cjs";

const app = mod?.default ?? mod;

export default function handler(req, res) {
  return app(req, res);
}

