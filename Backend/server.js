import app from "./app.js";

app.get("/", (req, res) => {
  res.status(200).send("setting up backend");
});
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`listening to port ${PORT}`);
});
