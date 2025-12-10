import open from "open"; // <-- додай імпорт угорі (новий пакет)
import app from "./app.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  open(`http://localhost:${PORT}`); // <-- автоматично відкриває браузер
});
