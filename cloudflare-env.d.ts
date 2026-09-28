declare namespace Cloudflare {
  interface Env {
    GOOGLE_CLIENT_ID?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
