import { Avatar } from "./index";
import * as fs from "fs"
import { BackgroundType, AvatarType } from "./src/types";

let image = await Avatar.assemble(Math.random().toString(16), AvatarType.Robots, BackgroundType.Landscape, "png")
const buffer = await image.toBuffer()
fs.writeFileSync(import.meta.dir + "/temp.jpeg", buffer)