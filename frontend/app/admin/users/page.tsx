"use client";

import { Edit, KeyRound, Power, ShieldCheck, ShieldOff, Upload, UserPlus } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { AdminField, inputClass } from "@/components/admin/AdminField";
import { Button } from "@/components/ui/Button";
import { adminRequest, adminUpload } from "@/lib/auth";
import { formatDate, getAssetUrl } from "@/lib/utils";
import type { AdminUser, MediaAsset } from "@/types/blog";

type MfaSetup = {
  secret: string;
  provisioning_uri: string;
  qr_code_data_url: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<AdminUser | null>(null);
  const [mfaTarget, setMfaTarget] = useState<AdminUser | null>(null);
  const [mfaSetup, setMfaSetup] = useState<MfaSetup | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  async function load() {
    try {
      setUsers(await adminRequest<AdminUser[]>("/admin/users"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setAvatarUrl(editing?.avatar ?? "");
  }, [editing]);

  async function uploadAvatar(file: File | null) {
    if (!file) return;
    setUploadingAvatar(true);
    setError("");
    setNotice("");
    const payload = new FormData();
    payload.append("file", file);
    payload.append("usage_type", "avatar");
    try {
      const asset = await adminUpload<MediaAsset>("/admin/uploads/image", payload);
      setAvatarUrl(asset.url);
      setNotice("用户头像已上传。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "头像上传失败");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      username: form.get("username"),
      password: form.get("password"),
      nickname: form.get("nickname"),
      email: form.get("email") || null,
      avatar: avatarUrl || null,
      role: form.get("role"),
      is_active: form.get("is_active") === "on",
    };
    try {
      if (editing) {
        await adminRequest(`/admin/users/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify({
            nickname: payload.nickname,
            email: payload.email,
            avatar: payload.avatar,
            role: payload.role,
            is_active: payload.is_active,
          }),
        });
        setNotice("用户已保存，列表已刷新。");
      } else {
        await adminRequest("/admin/users", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setNotice("用户已新增，列表已刷新。");
      }
      setEditing(null);
      setAvatarUrl("");
      formElement.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: AdminUser) {
    setError("");
    setNotice("");
    try {
      await adminRequest(`/admin/users/${user.id}/${user.is_active ? "disable" : "enable"}`, { method: "POST" });
      await load();
      setNotice(user.is_active ? "用户已停用。" : "用户已启用。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordTarget) return;
    const form = new FormData(event.currentTarget);
    setError("");
    setNotice("");
    try {
      await adminRequest(`/admin/users/${passwordTarget.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password: form.get("password") }),
      });
      setPasswordTarget(null);
      setNotice("密码已重置。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "重置失败");
    }
  }

  async function setupMfa(user: AdminUser) {
    setError("");
    setNotice("");
    try {
      const setup = await adminRequest<MfaSetup>(`/admin/users/${user.id}/mfa/setup`, { method: "POST" });
      setMfaTarget(user);
      setMfaSetup(setup);
      setNotice("MFA 二维码已生成，请扫码绑定后输入动态码验证。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "MFA 设置失败");
    }
  }

  async function verifyMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mfaTarget) return;
    const form = new FormData(event.currentTarget);
    setError("");
    setNotice("");
    try {
      await adminRequest(`/admin/users/${mfaTarget.id}/mfa/verify`, {
        method: "POST",
        body: JSON.stringify({ code: form.get("code") }),
      });
      setMfaTarget(null);
      setMfaSetup(null);
      await load();
      setNotice("MFA 已启用。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "验证失败");
    }
  }

  async function disableMfa(user: AdminUser) {
    setError("");
    setNotice("");
    try {
      await adminRequest(`/admin/users/${user.id}/mfa/disable`, { method: "POST" });
      await load();
      setNotice("MFA 已关闭。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "关闭失败");
    }
  }

  return (
    <>
      <div className="mb-6">
        <p className="text-sm font-bold text-ocean">Users</p>
        <h1 className="mt-2 text-2xl font-black text-ink dark:text-slate-100">用户管理</h1>
      </div>
      {error ? <p className="notice-pop mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-red-500/10 dark:text-red-200">{error}</p> : null}
      {notice ? <p className="notice-pop mb-4 rounded-md bg-green-50 px-3 py-2 text-sm font-bold text-green-700 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p> : null}

      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <div className="grid gap-5">
          <form key={editing?.id ?? "new"} onSubmit={handleSubmit} className="motion-surface grid gap-4 rounded-lg border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <h2 className="text-lg font-black text-ink dark:text-slate-100">{editing ? "编辑用户" : "新增用户"}</h2>
            <AdminField label="用户名">
              <input name="username" required disabled={Boolean(editing)} defaultValue={editing?.username ?? ""} className={inputClass} />
            </AdminField>
            {!editing ? (
              <AdminField label="初始密码">
                <input name="password" type="password" required className={inputClass} />
                <span className="text-xs font-medium text-ink/50 dark:text-slate-500">至少 8 位，不能全部为数字或字母。</span>
              </AdminField>
            ) : null}
            <AdminField label="昵称">
              <input name="nickname" required defaultValue={editing?.nickname ?? ""} className={inputClass} />
            </AdminField>
            <AdminField label="邮箱">
              <input name="email" type="email" defaultValue={editing?.email ?? ""} className={inputClass} />
            </AdminField>
            <AdminField label="头像 URL">
              <div className="grid gap-2">
                <input name="avatar" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} className={inputClass} />
                <label className="interactive inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md bg-paper px-3 py-2 text-sm font-bold text-ink ring-1 ring-ink/10 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  {uploadingAvatar ? "上传中..." : "上传头像"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) => void uploadAvatar(event.target.files?.[0] ?? null)}
                    disabled={uploadingAvatar}
                  />
                </label>
                {avatarUrl ? (
                  <img src={getAssetUrl(avatarUrl)} alt="用户头像预览" className="h-16 w-16 rounded-md object-cover ring-1 ring-ink/10 dark:ring-white/10" />
                ) : null}
              </div>
            </AdminField>
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminField label="角色">
                <select name="role" defaultValue={editing?.role ?? "editor"} className={inputClass}>
                  <option value="admin">管理员</option>
                  <option value="editor">编辑</option>
                </select>
              </AdminField>
              <label className="flex items-center gap-2 self-end rounded-md bg-paper px-3 py-2 text-sm font-bold text-ink dark:bg-white/10 dark:text-slate-200">
                <input name="is_active" type="checkbox" defaultChecked={editing?.is_active ?? true} />
                启用账号
              </label>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                {editing ? "保存修改" : "新增用户"}
              </Button>
              {editing ? (
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                  取消
                </Button>
              ) : null}
            </div>
          </form>

          {passwordTarget ? (
            <form onSubmit={resetPassword} className="motion-surface grid gap-4 rounded-lg border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
              <h2 className="text-lg font-black text-ink dark:text-slate-100">重置密码：{passwordTarget.username}</h2>
              <AdminField label="新密码">
                <input name="password" type="password" required className={inputClass} />
              </AdminField>
              <div className="flex gap-2">
                <Button type="submit">
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                  确认重置
                </Button>
                <Button type="button" variant="ghost" onClick={() => setPasswordTarget(null)}>
                  取消
                </Button>
              </div>
            </form>
          ) : null}

          {mfaTarget && mfaSetup ? (
            <form onSubmit={verifyMfa} className="motion-surface grid gap-4 rounded-lg border border-ink/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
              <h2 className="text-lg font-black text-ink dark:text-slate-100">启用 MFA：{mfaTarget.username}</h2>
              <div className="grid gap-3 rounded-md bg-paper p-3 text-xs font-bold leading-6 text-ink/70 dark:bg-slate-950 dark:text-slate-300">
                <div className="grid place-items-center rounded-md bg-white p-3 dark:bg-slate-100">
                  <img src={mfaSetup.qr_code_data_url} alt="MFA 绑定二维码" className="h-44 w-44" />
                </div>
                <p>Secret：{mfaSetup.secret}</p>
                <p className="break-all">URI：{mfaSetup.provisioning_uri}</p>
              </div>
              <AdminField label="动态验证码">
                <input name="code" inputMode="numeric" required className={inputClass} />
              </AdminField>
              <div className="flex gap-2">
                <Button type="submit">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  验证并启用
                </Button>
                <Button type="button" variant="ghost" onClick={() => setMfaTarget(null)}>
                  取消
                </Button>
              </div>
            </form>
          ) : null}
        </div>

        <div className="motion-surface overflow-x-auto rounded-lg border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
          <table className="admin-table w-full min-w-[980px] text-sm">
            <thead className="bg-paper text-left text-ink/60 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="p-3">用户</th>
                <th className="p-3">角色</th>
                <th className="p-3">状态</th>
                <th className="p-3">MFA</th>
                <th className="p-3">最近登录</th>
                <th className="p-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-ink/10 dark:border-white/10">
                  <td className="p-3">
                    <p className="font-black text-ink dark:text-slate-100">{user.nickname}</p>
                    <p className="text-xs font-bold text-ink/50 dark:text-slate-500">{user.username} {user.email ? ` / ${user.email}` : ""}</p>
                  </td>
                  <td className="p-3 text-ink/65 dark:text-slate-400">{user.role === "admin" ? "管理员" : "编辑"}</td>
                  <td className="p-3">
                    <span className={user.is_active ? "rounded-md bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200" : "rounded-md bg-red-50 px-2 py-1 text-xs font-black text-red-700 dark:bg-red-500/10 dark:text-red-200"}>
                      {user.is_active ? "启用" : "停用"}
                    </span>
                  </td>
                  <td className="p-3 text-ink/65 dark:text-slate-400">{user.mfa_enabled ? "已启用" : "未启用"}</td>
                  <td className="p-3 text-ink/65 dark:text-slate-400">{user.last_login_at ? formatDate(user.last_login_at) : "-"}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" onClick={() => setEditing(user)}>
                        <Edit className="h-4 w-4" />
                        编辑
                      </Button>
                      <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" onClick={() => setPasswordTarget(user)}>
                        <KeyRound className="h-4 w-4" />
                        密码
                      </Button>
                      <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" onClick={() => toggleActive(user)}>
                        <Power className="h-4 w-4" />
                        {user.is_active ? "停用" : "启用"}
                      </Button>
                      {user.mfa_enabled ? (
                        <>
                          <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" onClick={() => setupMfa(user)}>
                            <ShieldCheck className="h-4 w-4" />
                            重置 MFA
                          </Button>
                          <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" onClick={() => disableMfa(user)}>
                            <ShieldOff className="h-4 w-4" />
                            解绑 MFA
                          </Button>
                        </>
                      ) : (
                        <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" onClick={() => setupMfa(user)}>
                          <ShieldCheck className="h-4 w-4" />
                          设置 MFA
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
