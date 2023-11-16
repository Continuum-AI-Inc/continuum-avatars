import * as fs from "fs";
import * as path from "path";
import { createHash } from "crypto";
import { walkSync, natsort } from "./utils";
import sharp from "sharp";
import { BackgroundType, AvatarType } from "./types";

export class Avatar {
	private format: string = "png";
	private digestHex: string;
	private hashArray: number[] = [];
	private iter: number = 4;
	private resourceDirectory: string = import.meta.dir + "/";
	private sets: string[];
	private backgroundSets: string[];
	private colors: string[];

	/**
	 * Creates our Robohasher
		Takes in the string to make a Robohash out of.
	 * @param token 
	 * @param hashCount 
	 * @param ignoreExtension 
	 */
	public constructor(
		public token: string,
		public hashCount: number = 11,
		public ignoreExtension: boolean = true
	) {
		// Default to png
		this.format = "png";

		// Optionally remove an images extension before hashing.
		if (ignoreExtension === true) {
			token = this.removeExtensions(token);
		}

		const hash = createHash("sha512");
		hash.update(token);
		this.digestHex = hash.digest("hex");
		this.hashArray = [];
		//Start this at 4, so earlier is reserved
		//0 = Color
		//1 = Set
		//2 = bgset
		//3 = BG
		this.iter = 4;
		this.createHashes(hashCount);

		this.resourceDirectory = import.meta.dir + "/";
		// Get the list of backgrounds and RobotSets
		this.sets = this.listDirectories(this.resourceDirectory + "sets");
		this.backgroundSets = this.listDirectories(this.resourceDirectory + "backgrounds");

		// Get the colors in set1
		this.colors = this.listDirectories(this.resourceDirectory + "sets/set1");
	}

	/**
	 * Sets the string, to create the Robohash
	 * @param string
	 * @returns
	 */
	private removeExtensions(string: string) {
		// If the user hasn't disabled it, we will detect image extensions, such as .png, .jpg, etc.
		// We'll remove them from the string before hashing.
		// This ensures that /Bear.png and /Bear.bmp will send back the same image, in different formats.

		const lowerCase = string.toLowerCase();
		if (
			[".png", ".gif", ".jpg", ".bmp", ".jpeg", ".ppm", ".datauri"].some(
				(ending) => lowerCase.endsWith(ending)
			)
		) {
			let lastDotIndex = string.lastIndexOf(".");
			let format = string.substring(lastDotIndex + 1);
			if (format.toLowerCase() === "jpg") {
				format = "jpeg";
			}
			this.format = format;
			string = string.substring(0, lastDotIndex);
		}
		return string;
	}

	/**
	 *  Breaks up our hash into slots, so we can pull them out later.
			Essentially, it splits our SHA/MD5/etc into X parts.
	 * @param count 
	 */
	public createHashes(count: number) {
		for (let i = 0; i < count; i++) {
			//Get 1/numblocks of the hash
			const blocksize = Math.round(this.digestHex.length / count);
			const currentstart = (1 + i) * blocksize - blocksize;
			const currentend = (1 + i) * blocksize;
			this.hashArray.push(
				parseInt(this.digestHex.substring(currentstart, currentend), 16)
			);
		}

		// Workaround for adding more sets in 2019.
		// We run out of blocks, because we use some for each set, whether it's called or not.
		// I can't easily change this without invalidating every hash so far :/
		// This shouldn't reduce the security since it should only draw from one set of these in practice.
		this.hashArray = [...this.hashArray, ...this.hashArray];
	}

	public listDirectories(path: string) {
		const dirs = fs
			.readdirSync(path)
			.filter((d) => fs.statSync(`${path}/${d}`).isDirectory());
		//return natsort()(dirs);
		return dirs.sort((a, b) =>
			a.localeCompare(b, undefined, {
				numeric: true,
				sensitivity: "base",
			})
		);
	}

	/**
	 * Go through each subdirectory of `path`, and choose one file from each to use in our hash.
		Continue to increase self.iter, so we use a different 'slot' of randomness each time.
	 * @param path 
	 */
	private getListOfFiles(dir: string) {
		const chosen_files: string[] = [];

		// Get a list of all subdirectories
		let directories: string[] = [];

		for (const [root, dirs] of walkSync(dir)) {
			for (const name of dirs) {
				if (!name.startsWith(".")) {
					directories.push(path.join(root, name));
					directories = natsort(directories);
				}
			}
		}

		// Go through each directory in the list, and choose one file from each.
		// Add this file to our master list of robotparts.
		for (const directory of directories) {
			let files_in_dir: string[] = [];
			for (const imagefile of natsort(fs.readdirSync(directory))) {
				files_in_dir.push(path.join(directory, imagefile));
				files_in_dir = natsort(files_in_dir);
			}

			// Use some of our hash bits to choose which file
			let element_in_list =
				this.hashArray[this.iter] % files_in_dir.length;
			chosen_files.push(files_in_dir[element_in_list]);
			this.iter += 1;
		}

		return chosen_files;
	}

	/**
	 * Build our Robot!
		Returns the robot image itthis.
	 * @param roboset 
	 * @param color 
	 * @param format 
	 * @param backgroundSet 
	 * @param sizeX 
	 * @param sizeY 
	 */
	public static async assemble(
		token: string,
		roboset: AvatarType | null = null,
		backgroundSet: BackgroundType | null = null,
		color: string = "",
		format: string | null = null,
		sizeX = 300,
		sizeY = 300
	) {
		const generator = new Avatar(token, 11, true);
		// Allow users to manually specify a robot 'set' that they like.
		// Ensure that this is one of the allowed choices, or allow all
		// If they don't set one, take the first entry from sets above.

		if (roboset == null) {
			roboset = generator.sets[generator.hashArray[1] % generator.sets.length] as AvatarType;
		} else if (generator.sets.indexOf(roboset) == -1) {
			// Roboset not found in available sets
			roboset = generator.sets[0] as AvatarType;
		}

		// Only set1 is setup to be color-seletable. The others don't have enough pieces in various colors.
		// This could/should probably be expanded at some point..
		// Right now, this feature is almost never used. ( It was < 44 requests this year, out of 78M reqs )

		if (roboset == "set1") {
			if (generator.colors.indexOf(color) > -1) {
				roboset = "set1/" + color as AvatarType;
			} else {
				const randomColor =
					generator.colors[generator.hashArray[0] % generator.colors.length];
				roboset = "set1/" + randomColor as AvatarType;
			}
		}

		// If they specified a background, ensure it's legal, then give it to them.
		if (backgroundSet && generator.backgroundSets.indexOf(backgroundSet) == -1) {
			// Roboset not found in available sets
			backgroundSet = generator.backgroundSets[0] as BackgroundType;
		}

		// If we set a format based on extension earlier, use that. Otherwise, PNG.
		if (format === null) {
			format = generator.format;
		}
		// Each directory in our set represents one piece of the Robot, such as the eyes, nose, mouth, etc.

		// Each directory is named with two numbers - The number before the // is the sort order.
		// This ensures that they always go in the same order when choosing pieces, regardless of OS.

		// The second number is the order in which to apply the pieces.
		// For instance, the head has to go down BEFORE the eyes, or the eyes would be hidden.

		// First, we'll get a list of parts of our robot.

		let roboparts = generator.getListOfFiles(
			generator.resourceDirectory + "sets/" + roboset
		);
		// Now that we've sorted them by the first number, we need to sort each sub-category by the second.
		roboparts = roboparts.sort((a, b) => {
				const aSplit = a.split("#");
				const bSplit = b.split("#");
		
				return aSplit[1].localeCompare(bSplit[1], undefined, { numeric: true, sensitivity: 'base' });
		});
		

		// Paste in each piece of the Robot.
		const buffers = await Promise.all(roboparts.map(async (part) => {
			const img = sharp(part).resize(1024, 1024);
			return await img.toBuffer();
		}));
		let roboimg = sharp(buffers[0]);
		for (const buffer of buffers.slice(1)) {
			roboimg = sharp(await roboimg.toBuffer()).composite([
				{ input: buffer, top: 0, left: 0 },
			]);
		}

		if (backgroundSet !== null) {
			let bglist: string[] = [];
			const backgrounds = natsort(
				fs.readdirSync(generator.resourceDirectory + "backgrounds/" + backgroundSet)
			).sort();
			for (const ls of backgrounds) {
				if (!ls.startsWith(".")) {
					bglist.push(
						generator.resourceDirectory + "backgrounds/" + backgroundSet + "/" + ls
					);
				}
			}
			let background = bglist[generator.hashArray[3] % bglist.length];
			const bg = sharp(background).resize(1024, 1024);
			const buffer = await roboimg.toBuffer();
			roboimg = bg.composite([
				{ input: buffer, top: 0, left: 0 },
			]);
		}
		// If we're a BMP, flatten the image.
		if (["bmp", "jpeg"].indexOf(format) > -1) {
			//Flatten bmps
			roboimg = roboimg.toColorspace("srgb").removeAlpha();
		}

		generator.format = format;

		return roboimg;
	}
}
