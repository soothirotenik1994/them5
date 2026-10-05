import fs from "fs";
import path from "path";
console.log(process.cwd());
console.log(fs.existsSync(path.join(process.cwd(), "uploads", "lobby_loft_m5_1782203250164.jpg")));
