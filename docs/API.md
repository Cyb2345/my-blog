# API 说明

统一前缀：`/api/v1`

## 认证

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`

## 公开接口

- `GET /health`
- `GET /posts`
- `GET /posts/search?keyword=`
- `GET /posts/{slug}`
- `GET /categories`
- `GET /categories/{slug}/posts`
- `GET /tags`
- `GET /tags/{slug}/posts`
- `GET /comments`
- `POST /comments`
- `GET /links`

## 后台接口

后台接口需要请求头：

```text
Authorization: Bearer <token>
```

- `GET /admin/stats`
- `GET /admin/posts`
- `POST /admin/posts`
- `GET /admin/posts/{id}`
- `PUT /admin/posts/{id}`
- `DELETE /admin/posts/{id}`
- `POST /admin/posts/{id}/publish`
- `POST /admin/posts/{id}/unpublish`
- `GET /admin/categories`
- `POST /admin/categories`
- `PUT /admin/categories/{id}`
- `DELETE /admin/categories/{id}`
- `GET /admin/tags`
- `POST /admin/tags`
- `PUT /admin/tags/{id}`
- `DELETE /admin/tags/{id}`
- `GET /admin/links`
- `POST /admin/links`
- `PUT /admin/links/{id}`
- `DELETE /admin/links/{id}`
- `GET /admin/comments`
- `POST /admin/comments/{id}/approve`
- `POST /admin/comments/{id}/reject`
- `DELETE /admin/comments/{id}`
- `POST /admin/uploads/image`
