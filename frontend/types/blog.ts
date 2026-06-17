export type Envelope<T> = {
  code: number;
  message: string;
  data: T;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  sort_order: number;
  post_count?: number;
  article_count?: number;
  created_at: string;
  updated_at: string;
};

export type Tag = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  post_count?: number;
  article_count?: number;
  created_at: string;
  updated_at: string;
};

export type Post = {
  id: number;
  title: string;
  slug: string;
  summary?: string | null;
  content?: string;
  cover_image?: string | null;
  status: "draft" | "published" | "deleted";
  view_count: number;
  is_recommended: boolean;
  is_top: boolean;
  author?: Pick<AdminUser, "id" | "username" | "nickname" | "avatar"> | null;
  category_id?: number | null;
  category?: Category | null;
  tags: Tag[];
  created_at: string;
  updated_at: string;
  published_at?: string | null;
};

export type PostDetail = {
  post: Post & { content: string };
  previous?: Post | null;
  next?: Post | null;
};

export type CommentItem = {
  id: number;
  nickname: string;
  email?: string;
  content: string;
  status: "pending" | "approved" | "rejected";
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  updated_at: string;
};

export type FriendLink = {
  id: number;
  name: string;
  url: string;
  description?: string | null;
  avatar?: string | null;
  status: "active" | "inactive";
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type AdminStats = {
  total_posts: number;
  published_posts: number;
  draft_posts: number;
  categories: number;
  tags: number;
  comments: number;
  pending_comments: number;
  links: number;
  users?: number;
  media?: number;
};

export type AdminUser = {
  id: number;
  username: string;
  email?: string | null;
  nickname: string;
  avatar?: string | null;
  role: "admin" | "editor";
  is_active: boolean;
  mfa_enabled: boolean;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type MediaAsset = {
  id: number;
  filename: string;
  original_name: string;
  original_filename?: string;
  url: string;
  storage_type: "r2" | "local" | "s3" | "oss" | "minio";
  bucket?: string | null;
  object_key: string;
  mime_type: string;
  size: number;
  width?: number | null;
  height?: number | null;
  usage_type: "general" | "post_cover" | "article_image" | "login_background" | "site_hero" | "avatar" | "link_avatar";
  display_mode?: string | null;
  is_active: boolean;
  created_by_id?: number | null;
  created_at: string;
  updated_at: string;
};

export type NavigationItem = {
  id: number;
  label: string;
  href: string;
  icon?: string | null;
  sort_order: number;
  target: "self" | "blank";
  is_visible: boolean;
  created_at: string;
  updated_at: string;
};

export type SiteConfig = Record<string, string>;

export type CaptchaPayload = {
  captcha_id: string;
  image: string;
};

export type LoginSuccess = {
  access_token: string;
  token_type: string;
};

export type ServiceMonitor = {
  data_source: "prometheus" | "psutil_fallback";
  warning?: string | null;
  timestamp: string;
  host?: {
    cpu: {
      usage_percent: number;
    };
    memory: {
      total: number;
      used: number;
      available: number;
      usage_percent: number;
    };
    disk: {
      total: number;
      used: number;
      free: number;
      usage_percent: number;
    };
    load: {
      load1: number;
      load5: number;
      load15: number;
    };
    network: {
      rx_bytes_per_second: number;
      tx_bytes_per_second: number;
    };
  } | null;
  containers: Array<{
    name: string;
    status: string;
    cpu_usage_percent: number;
    memory_usage_bytes: number;
    last_seen?: string | null;
  }>;
  cpu: {
    usage_percent: number;
    core_count: number;
    user_percent: number;
    system_percent: number;
    idle_percent: number;
  };
  memory: {
    total: number;
    used: number;
    available: number;
    usage_percent: number;
  };
  server: {
    hostname: string;
    ip: string;
    os: string;
    platform: string;
    architecture: string;
    boot_time: string;
    uptime_seconds: number;
  };
  runtime: {
    backend_framework: string;
    python_version: string;
    process_id: number;
    process_start_time: string;
    process_uptime_seconds: number;
    project_path: string;
    storage_type: string;
    r2_enabled: boolean;
  };
  disks: Array<{
    mountpoint: string;
    filesystem: string;
    total: number;
    used: number;
    free: number;
    usage_percent: number;
  }>;
};

export type AdminRole = {
  name: string;
  code: "admin" | "editor";
  description: string;
  status: "active" | "inactive";
  user_count: number;
  menu_permissions: string[];
  api_permissions: string[];
  created_at?: string | null;
  updated_at?: string | null;
};

export type SystemParam = {
  id: number;
  name: string;
  key: string;
  value: string;
  is_system: boolean;
  remark?: string | null;
  created_at: string;
  updated_at: string;
};

export type FileStorageConfig = {
  id: number;
  name: string;
  storage_type: "r2" | "local" | "s3";
  is_primary: boolean;
  status: "active" | "inactive";
  bucket?: string | null;
  endpoint?: string | null;
  public_base_url?: string | null;
  object_prefix?: string | null;
  access_key_id?: string | null;
  secret_access_key?: string | null;
  max_upload_size_mb: number;
  allowed_file_types: string;
  remark?: string | null;
  created_at: string;
  updated_at: string;
};

export type OperationLog = {
  id: number;
  operator_id?: number | null;
  operator_username?: string | null;
  request_path: string;
  request_method: string;
  api_name?: string | null;
  ip?: string | null;
  ip_location?: string | null;
  duration_ms: number;
  request_body?: string | null;
  response_code?: number | null;
  created_at: string;
  updated_at: string;
};

export type AccessLog = {
  id: number;
  ip?: string | null;
  ip_location?: string | null;
  browser?: string | null;
  os?: string | null;
  path: string;
  referer?: string | null;
  user_agent?: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminMenuItem = {
  id: number;
  parent_id?: number | null;
  name: string;
  icon?: string | null;
  type: "directory" | "menu" | "button";
  route?: string | null;
  component?: string | null;
  permission?: string | null;
  sort_order: number;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  children: AdminMenuItem[];
};
