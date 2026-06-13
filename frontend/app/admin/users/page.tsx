"use client";

import { Edit, KeyRound, Plus, Power, ShieldCheck, ShieldOff, Upload } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { AdminField, inputClass } from "@/components/admin/AdminField";
import { AdminModal, ModalError } from "@/components/admin/AdminModal";
import { Button } from "@/components/ui/Button";
import { adminRequest, adminUpload } from "@/lib/auth";
import { formatDate, getAssetUrl } from "@/lib/utils";
import type { AdminUser, MediaAsset } from "@/types/blog";

type MfaSetup = {
  secret: string;
  provisioning_uri: string;
  qr_code_data_url: string;
};

type UserModalState =
  | { type: "user"; mode: "create" | "edit"; user?: AdminUser }
  | { type: "password"; user: AdminUser }
  | { type: "mfa"; user: AdminUser };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [modal, setModal] = useState<UserModalState | null>(null);
  const [mfaSetup, setMfaSetup] = useState<MfaSetup | null>(null);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
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

  function openUserModal(mode: "create" | "edit", user?: AdminUser) {
    setModalError("");
    setAvatarUrl(user?.avatar ?? "");
    setModal({ type: "user", mode, user });
  }

  function closeModal() {
    if (saving || uploadingAvatar) return;
    setModal(null);
    setModalError("");
    setMfaSetup(null);
    setAvatarUrl("");
  }

  async function uploadAvatar(file: File | null) {
    if (!file) return;
    setUploadingAvatar(true);
    setModalError("");
    setNotice("");
    const payload = new FormData();
    payload.append("file", file);
    payload.append("usage_type", "avatar");
    try {
      const asset = await adminUpload<MediaAsset>("/admin/uploads/image", payload);
      setAvatarUrl(asset.url);
      setNotice("用户头像已上传。");
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "头像上传失败");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleUserSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal || modal.type !== "user") return;
    setModalError("");
    setNotice("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const password = String(form.get("password") ?? "");
    const payload = {
      username: String(form.get("username") ?? "").trim(),
      password,
      nickname: String(form.get("nickname") ?? "").trim(),
      email: form.get("email") ? String(form.get("email")) : null,
      avatar: avatarUrl || null,
      role: String(form.get("role") ?? "editor"),
      is_active: form.get("is_active") === "on",
    };
    if (!payload.username || !payload.nickname) {
      setModalError("用户名和昵称不能为空");
      return;
    }
    if (modal.mode === "create" && password.length < 8) {
      setModalError("初始密码至少 8 位");
      return;
    }
    setSaving(true);
    try {
      if (modal.mode === "edit" && modal.user) {
        await adminRequest(`/admin/users/${modal.user.id}`, {
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
      setModal(null);
      setModalError("");
      setAvatarUrl("");
      formElement.reset();
      await load();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "保存失败");
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
    if (!modal || modal.type !== "password") return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirm_password") ?? "");
    if (password.length < 8) {
      setModalError("新密码至少 8 位");
      return;
    }
    if (password !== confirmPassword) {
      setModalError("两次输入的密码不一致");
      return;
    }
    setSaving(true);
    setModalError("");
    setNotice("");
    try {
      await adminRequest(`/admin/users/${modal.user.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setModal(null);
      setModalError("");
      setNotice("密码已重置。");
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "重置失败");
    } finally {
      setSaving(false);
    }
  }

  async function setupMfa(user: AdminUser) {
    if (user.mfa_enabled && !window.confirm(`确认重置用户「${user.username}」的 MFA 吗？`)) return;
    setError("");
    setModalError("");
    setNotice("");
    try {
      const setup = await adminRequest<MfaSetup>(`/admin/users/${user.id}/mfa/setup`, { method: "POST" });
      setMfaSetup(setup);
      setModal({ type: "mfa", user });
      setNotice("MFA 二维码已生成，请扫码绑定后输入动态码验证。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "MFA 设置失败");
    }
  }

  async function verifyMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal || modal.type !== "mfa") return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setModalError("");
    setNotice("");
    try {
      await adminRequest(`/admin/users/${modal.user.id}/mfa/verify`, {
        method: "POST",
        body: JSON.stringify({ code: form.get("code") }),
      });
      setModal(null);
      setModalError("");
      setMfaSetup(null);
      await load();
      setNotice("MFA 已启用。");
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "验证失败");
    } finally {
      setSaving(false);
    }
  }

  async function disableMfa(user: AdminUser) {
    if (!window.confirm(`确认解绑用户「${user.username}」的 MFA 吗？`)) return;
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

      <section className="motion-surface overflow-hidden rounded-lg border border-ink/10 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3 border-b border-ink/10 p-4 dark:border-white/10">
          <Button type="button" onClick={() => openUserModal("create")}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            新增用户
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table w-full min-w-[1080px] text-sm">
            <thead className="bg-paper text-left text-ink/60 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="p-3">用户名</th>
                <th className="p-3">昵称</th>
                <th className="p-3">邮箱</th>
                <th className="p-3">角色</th>
                <th className="p-3">状态</th>
                <th className="p-3">MFA 状态</th>
                <th className="p-3">最后登录时间</th>
                <th className="p-3">创建时间</th>
                <th className="p-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-ink/10 dark:border-white/10">
                  <td className="p-3 font-black text-ink dark:text-slate-100">{user.username}</td>
                  <td className="p-3 text-ink/65 dark:text-slate-400">{user.nickname}</td>
                  <td className="p-3 text-ink/65 dark:text-slate-400">{user.email || "-"}</td>
                  <td className="p-3 text-ink/65 dark:text-slate-400">{user.role === "admin" ? "管理员" : "编辑"}</td>
                  <td className="p-3">
                    <span className={user.is_active ? "rounded-md bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200" : "rounded-md bg-red-50 px-2 py-1 text-xs font-black text-red-700 dark:bg-red-500/10 dark:text-red-200"}>
                      {user.is_active ? "启用" : "停用"}
                    </span>
                  </td>
                  <td className="p-3 text-ink/65 dark:text-slate-400">{user.mfa_enabled ? "已启用" : "未启用"}</td>
                  <td className="p-3 text-ink/65 dark:text-slate-400">{user.last_login_at ? formatDate(user.last_login_at) : "-"}</td>
                  <td className="p-3 text-ink/65 dark:text-slate-400">{formatDate(user.created_at)}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" onClick={() => openUserModal("edit", user)}>
                        <Edit className="h-4 w-4" />
                        编辑
                      </Button>
                      <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" onClick={() => { setModalError(""); setModal({ type: "password", user }); }}>
                        <KeyRound className="h-4 w-4" />
                        密码
                      </Button>
                      <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" onClick={() => void toggleActive(user)}>
                        <Power className="h-4 w-4" />
                        {user.is_active ? "停用" : "启用"}
                      </Button>
                      {user.mfa_enabled ? (
                        <>
                          <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" onClick={() => void setupMfa(user)}>
                            <ShieldCheck className="h-4 w-4" />
                            重置 MFA
                          </Button>
                          <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" onClick={() => void disableMfa(user)}>
                            <ShieldOff className="h-4 w-4" />
                            解绑 MFA
                          </Button>
                        </>
                      ) : (
                        <Button type="button" variant="ghost" className="h-9 min-h-9 px-3" onClick={() => void setupMfa(user)}>
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
      </section>

      <AdminModal open={modal?.type === "user"} title={modal?.type === "user" && modal.mode === "edit" ? "编辑用户" : "新增用户"} size="md" onClose={closeModal}>
        {modal?.type === "user" ? (
          <form key={modal.user?.id ?? "new"} onSubmit={handleUserSubmit} className="grid gap-4">
            <ModalError message={modalError} />
            <div className="grid gap-4 md:grid-cols-2">
              <AdminField label="用户名 *">
                <input name="username" required disabled={modal.mode === "edit"} defaultValue={modal.user?.username ?? ""} className={inputClass} />
              </AdminField>
              {modal.mode === "create" ? (
                <AdminField label="初始密码 *">
                  <input name="password" type="password" required className={inputClass} />
                </AdminField>
              ) : null}
              <AdminField label="昵称 *">
                <input name="nickname" required defaultValue={modal.user?.nickname ?? ""} className={inputClass} />
              </AdminField>
              <AdminField label="邮箱">
                <input name="email" type="email" defaultValue={modal.user?.email ?? ""} className={inputClass} />
              </AdminField>
              <AdminField label="角色">
                <select name="role" defaultValue={modal.user?.role ?? "editor"} className={inputClass}>
                  <option value="admin">管理员</option>
                  <option value="editor">编辑</option>
                </select>
              </AdminField>
              <label className="flex items-center gap-2 self-end rounded-md bg-paper px-3 py-2 text-sm font-bold text-ink dark:bg-white/10 dark:text-slate-200">
                <input name="is_active" type="checkbox" defaultChecked={modal.user?.is_active ?? true} />
                启用账号
              </label>
            </div>
            <AdminField label="头像 URL">
              <div className="grid gap-2">
                <input name="avatar" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} className={inputClass} />
                <label className="interactive inline-flex min-h-10 w-fit cursor-pointer items-center gap-2 rounded-md bg-paper px-3 py-2 text-sm font-bold text-ink ring-1 ring-ink/10 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
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
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={closeModal} disabled={saving || uploadingAvatar}>取消</Button>
              <Button type="submit" disabled={saving || uploadingAvatar}>{saving ? "提交中..." : "提交"}</Button>
            </div>
          </form>
        ) : null}
      </AdminModal>

      <AdminModal open={modal?.type === "password"} title={modal?.type === "password" ? `重置密码：${modal.user.username}` : "重置密码"} size="sm" onClose={closeModal}>
        {modal?.type === "password" ? (
          <form onSubmit={resetPassword} className="grid gap-4">
            <ModalError message={modalError} />
            <AdminField label="新密码 *">
              <input name="password" type="password" required className={inputClass} />
            </AdminField>
            <AdminField label="确认新密码 *">
              <input name="confirm_password" type="password" required className={inputClass} />
            </AdminField>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={closeModal} disabled={saving}>取消</Button>
              <Button type="submit" disabled={saving}>{saving ? "提交中..." : "提交"}</Button>
            </div>
          </form>
        ) : null}
      </AdminModal>

      <AdminModal open={modal?.type === "mfa"} title={modal?.type === "mfa" ? `启用 MFA：${modal.user.username}` : "启用 MFA"} size="sm" onClose={closeModal}>
        {modal?.type === "mfa" && mfaSetup ? (
          <form onSubmit={verifyMfa} className="grid gap-4">
            <ModalError message={modalError} />
            <div className="grid place-items-center rounded-md bg-white p-3 dark:bg-slate-100">
              <img src={mfaSetup.qr_code_data_url} alt="MFA 绑定二维码" className="h-44 w-44" />
            </div>
            <p className="text-xs font-bold leading-6 text-ink/55 dark:text-slate-500">
              请使用 Google Authenticator、Microsoft Authenticator、1Password 或 Authy 扫码绑定。为避免泄露，MFA Secret 不在后台明文展示。
            </p>
            <AdminField label="动态验证码 *">
              <input name="code" inputMode="numeric" required className={inputClass} />
            </AdminField>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={closeModal} disabled={saving}>取消</Button>
              <Button type="submit" disabled={saving}>{saving ? "提交中..." : "提交"}</Button>
            </div>
          </form>
        ) : null}
      </AdminModal>
    </>
  );
}
