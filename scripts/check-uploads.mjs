/**
 * Verifies the Cloudinary credentials in .env actually work.
 *
 *   npm run check-uploads
 *
 * Performs a real unsigned upload of a 1x1 PNG, which is the same request the
 * app makes from a device. Misconfiguration here is almost always one of two
 * things — a preset that exists but is set to "Signed", or a typo'd cloud name
 * — and both only surface deep inside the complaint flow otherwise.
 */

const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const preset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

if (!cloudName || !preset) {
    console.error(
        "\n✗ Not configured.\n" +
            "  Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and\n" +
            "      EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET in mgm-frontend/.env\n"
    );
    process.exit(1);
}

console.log(`\nCloud name : ${cloudName}`);
console.log(`Preset     : ${preset}\n`);

// Smallest valid PNG: a single transparent pixel.
const onePixelPng =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const form = new FormData();
form.append("file", `data:image/png;base64,${onePixelPng}`);
form.append("upload_preset", preset);

try {
    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: form }
    );

    const body = await res.json().catch(() => ({}));

    if (res.ok && body.secure_url) {
        console.log("✓ Upload succeeded.");
        console.log(`  ${body.secure_url}`);
        console.log("\n  Photo uploads are working. Restart Expo with --clear.\n");
    } else {
        const message = body?.error?.message ?? `HTTP ${res.status}`;
        console.error(`✗ Cloudinary rejected the upload: ${message}\n`);

        if (/whitelist|not allowed|unsigned/i.test(message)) {
            console.error(
                "  That message usually means the preset is set to Signed.\n" +
                    "  Cloudinary console -> Settings -> Upload -> Upload presets\n" +
                    "  -> edit the preset -> Signing mode: Unsigned -> Save.\n"
            );
        } else if (res.status === 404) {
            console.error("  A 404 usually means the cloud name is wrong.\n");
        }
        process.exitCode = 1;
    }
} catch (error) {
    console.error(
        `✗ Could not reach Cloudinary: ${error instanceof Error ? error.message : error}\n`
    );
    process.exitCode = 1;
}
