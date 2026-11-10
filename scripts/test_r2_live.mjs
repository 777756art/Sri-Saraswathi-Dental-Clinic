// test_r2_live.mjs
import fs from 'node:fs';
import {
  S3Client,
  ListBucketsCommand,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand
} from "@aws-sdk/client-s3";

const envContent = fs.existsSync('.env.api') ? fs.readFileSync('.env.api', 'utf8') : '';
function getEnv(name) {
  if (process.env[name]) return process.env[name];
  const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
  return match ? match[1].trim() : '';
}

const accountId = getEnv('CLOUDFLARE_ACCOUNT_ID');
const accessKeyId = getEnv('CLOUDFLARE_R2_ACCESS_KEY_ID');
const secretAccessKey = getEnv('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
const endpoint = getEnv('CLOUDFLARE_R2_ENDPOINT') || `https://${accountId}.r2.cloudflarestorage.com`;
const BUCKET_NAME = getEnv('CLOUDFLARE_R2_BUCKET') || "sri-saraswathi-dental-media";

const s3 = new S3Client({
  region: "auto",
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

async function main() {
  console.log("=== Testing Cloudflare R2 Live Connection ===");
  console.log("Endpoint:", endpoint);

  // 1. List existing buckets
  try {
    const list = await s3.send(new ListBucketsCommand({}));
    console.log("1. Live Buckets in Account:", list.Buckets?.map(b => b.Name));
  } catch (e) {
    console.log("1. ListBuckets warning:", e.message);
  }

  // 2. Check or create bucket 'sri-saraswathi-dental-media'
  let bucketExists = false;
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
    console.log(`2. Bucket '${BUCKET_NAME}' already exists in your Cloudflare R2 account!`);
    bucketExists = true;
  } catch (err) {
    console.log(`2. Bucket '${BUCKET_NAME}' does not exist yet. Creating it now...`);
    try {
      await s3.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
      console.log(`   Successfully created Cloudflare R2 Bucket: '${BUCKET_NAME}'!`);
      bucketExists = true;
    } catch (createErr) {
      console.error("   Failed to create bucket:", createErr.message);
    }
  }

  // 3. Test uploading a file
  if (bucketExists) {
    const testKey = "clinic/sri-saraswathi-dental-test.txt";
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: testKey,
      Body: "Sri Saraswathi Dental Clinic - Cloudflare R2 Storage Active!",
      ContentType: "text/plain",
    }));
    console.log(`3. Successfully uploaded test object '${testKey}' to live Cloudflare R2!`);

    const getRes = await s3.send(new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: testKey,
    }));
    const text = await getRes.Body.transformToString();
    console.log("4. Read back from live R2:", text);
    console.log("\n=== CLOUDFLARE R2 LIVE CONNECTION 100% VERIFIED & ACTIVE! ===");
  }
}

main().catch(console.error);
