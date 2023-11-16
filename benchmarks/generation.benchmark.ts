import { run, bench } from "mitata"
import { Avatar } from "../index"
import { BackgroundType, AvatarType } from "../src/types"

bench("Avatar Generation (Robot - Background)", async () => {
	// Generate an image
	const image = await Avatar.assemble(Math.random().toString(16), AvatarType.Robots, BackgroundType.Abstract);
})

bench("Avatar Generation (Robot - No Background)", async () => {
	// Generate an image
	const image = await Avatar.assemble(Math.random().toString(16), AvatarType.Robots, null);
})

await run({
	avg: true,
	json: false,
	colors: true,
	min_max: true
})