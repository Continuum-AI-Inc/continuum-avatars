import { expect, test } from "bun:test";
import { Avatar } from "../index";
import { BackgroundType, AvatarType } from "../src/types";

test("Robot generation", async () => {
	// Generate an image
	const image = await Avatar.assemble(Math.random().toString(16), AvatarType.Robots, BackgroundType.Abstract);

	expect(image).toBeDefined()

	// Convert image to Buffer
	const buffer = await image.toBuffer();

	// Validate buffer and buffer size
	expect(buffer).toBeDefined()
	expect(buffer.length).toBeGreaterThan(0)
})