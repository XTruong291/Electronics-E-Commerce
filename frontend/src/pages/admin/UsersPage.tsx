import React, { useEffect, useState, useCallback } from "react";
import {
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  Typography,
  Card,
  Popconfirm,
  Modal,
  Form,
  message,
  Tooltip,
  Badge,
} from "antd";
import {
  SearchOutlined,
  LockOutlined,
  UnlockOutlined,
  UserSwitchOutlined,
  ReloadOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import axiosClient from "../../api/axiosClient";
import { useAuthStore } from "../../store/useAuthStore";
import type { User, UserRole } from "../../types/auth";

const { Title, Text } = Typography;
const { Option } = Select;

interface UserListApiResult {
  items: User[];
  total: number;
  page: number;
  page_size: number;
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>(undefined);

  // Role change modal state
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>("CUSTOMER");
  const [actionLoading, setActionLoading] = useState(false);

  const currentUser = useAuthStore((state) => state.user);
  const isAdmin = currentUser?.role === "ADMIN";

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        page_size: pageSize,
      };
      if (search.trim()) params.search = search.trim();
      if (roleFilter) params.role = roleFilter;
      if (statusFilter !== undefined) params.is_active = statusFilter;

      const data = (await axiosClient.get("/admin/users", {
        params,
      })) as unknown as UserListApiResult;

      setUsers(data.items);
      setTotal(data.total);
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { detail?: string } } };
      message.error(anyErr.response?.data?.detail || "Không thể tải danh sách người dùng.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleStatus = async (user: User) => {
    if (user.id === currentUser?.id) {
      message.warning("Bạn không thể tự khóa tài khoản của chính mình!");
      return;
    }
    setActionLoading(true);
    try {
      await axiosClient.patch(`/admin/users/${user.id}/status`, {
        is_active: !user.is_active,
      });
      message.success(
        user.is_active
          ? "Đã khóa tài khoản thành công. Tất cả phiên đăng nhập đã bị chấm dứt."
          : "Đã mở khóa tài khoản thành công."
      );
      fetchUsers();
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { detail?: string } } };
      message.error(anyErr.response?.data?.detail || "Không thể cập nhật trạng thái tài khoản.");
    } finally {
      setActionLoading(false);
    }
  };

  const openRoleModal = (user: User) => {
    if (user.id === currentUser?.id) {
      message.warning("Bạn không thể tự thay đổi vai trò của chính mình!");
      return;
    }
    setSelectedUser(user);
    setSelectedRole(user.role);
    setRoleModalVisible(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await axiosClient.patch(`/admin/users/${selectedUser.id}/role`, {
        role: selectedRole,
      });
      message.success(
        `Đã cập nhật vai trò thành ${selectedRole}. Phiên làm việc của người dùng đã được làm mới.`
      );
      setRoleModalVisible(false);
      fetchUsers();
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { detail?: string } } };
      message.error(anyErr.response?.data?.detail || "Không thể thay đổi vai trò.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (user.id === currentUser?.id) {
      message.warning("Bạn không thể tự xóa tài khoản của chính mình!");
      return;
    }
    setActionLoading(true);
    try {
      await axiosClient.delete(`/admin/users/${user.id}`);
      message.success(`Đã xóa tài khoản "${user.full_name}" (${user.email}) thành công.`);
      fetchUsers();
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { detail?: string } } };
      message.error(anyErr.response?.data?.detail || "Không thể xóa người dùng.");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 70,
    },
    {
      title: "Họ và tên",
      dataIndex: "full_name",
      key: "full_name",
      render: (name: string, record: User) => (
        <div>
          <Text strong>{name}</Text>
          {record.id === currentUser?.id && (
            <Tag color="cyan" style={{ marginLeft: 8, fontSize: 11 }}>
              Bạn
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Số điện thoại",
      dataIndex: "phone",
      key: "phone",
      render: (phone: string | null) => phone || <Text type="secondary">—</Text>,
    },
    {
      title: "Vai trò",
      dataIndex: "role",
      key: "role",
      render: (role: UserRole) => {
        let color = "default";
        if (role === "ADMIN") color = "magenta";
        else if (role === "STAFF") color = "blue";
        else if (role === "CUSTOMER") color = "green";
        return <Tag color={color}>{role}</Tag>;
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "is_active",
      key: "is_active",
      render: (isActive: boolean) =>
        isActive ? (
          <Badge status="success" text="Hoạt động" />
        ) : (
          <Badge status="error" text="Đã khóa" />
        ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "created_at",
      key: "created_at",
      render: (dateStr: string) =>
        new Date(dateStr).toLocaleDateString("vi-VN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
    {
      title: "Hành động",
      key: "action",
      render: (_: unknown, record: User) => {
        const isSelf = record.id === currentUser?.id;
        if (!isAdmin) {
          return <Text type="secondary">Chỉ xem</Text>;
        }

        return (
          <Space size="small">
            <Tooltip
              title={
                isSelf
                  ? "Bạn không thể thay đổi vai trò của chính mình"
                  : "Thay đổi vai trò người dùng"
              }
            >
              <Button
                size="small"
                icon={<UserSwitchOutlined />}
                disabled={isSelf || actionLoading}
                onClick={() => openRoleModal(record)}
              >
                Đổi vai trò
              </Button>
            </Tooltip>

            <Tooltip
              title={
                isSelf
                  ? "Bạn không thể tự khóa tài khoản của mình"
                  : record.is_active
                  ? "Khóa tài khoản và thu hồi tất cả phiên đăng nhập"
                  : "Mở khóa tài khoản"
              }
            >
              <Popconfirm
                title={
                  record.is_active
                    ? "Bạn có chắc chắn muốn khóa tài khoản này? Tất cả phiên đăng nhập sẽ bị chấm dứt ngay lập tức!"
                    : "Bạn có chắc chắn muốn mở khóa tài khoản này?"
                }
                onConfirm={() => handleToggleStatus(record)}
                okText="Đồng ý"
                cancelText="Hủy"
                disabled={isSelf || actionLoading}
              >
                <Button
                  size="small"
                  danger={record.is_active}
                  icon={record.is_active ? <LockOutlined /> : <UnlockOutlined />}
                  disabled={isSelf || actionLoading}
                >
                  {record.is_active ? "Khóa" : "Mở khóa"}
                </Button>
              </Popconfirm>
            </Tooltip>
            <Tooltip
              title={
                isSelf
                  ? "Bạn không thể tự xóa tài khoản của chính mình"
                  : "Xóa vĩnh viễn tài khoản người dùng"
              }
            >
              <Popconfirm
                title="Xóa người dùng vĩnh viễn"
                description={`Bạn có chắc chắn muốn xóa tài khoản "${record.full_name}" không?`}
                onConfirm={() => handleDeleteUser(record)}
                okText="Xóa vĩnh viễn"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
                disabled={isSelf || actionLoading}
              >
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={isSelf || actionLoading}
                >
                  Xóa
                </Button>
              </Popconfirm>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Quản lý người dùng
          </Title>
          <Text type="secondary">
            Xem danh sách, phân quyền và kiểm soát trạng thái tài khoản người dùng
          </Text>
        </div>

        <Button icon={<ReloadOutlined />} onClick={fetchUsers} loading={loading}>
          Làm mới
        </Button>
      </div>

      <Card style={{ marginBottom: 20, borderRadius: 8 }}>
        <Space wrap size="middle">
          <Input
            placeholder="Tìm theo email hoặc họ tên..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => {
              setPage(1);
              fetchUsers();
            }}
            style={{ width: 260 }}
            allowClear
          />

          <Select
            placeholder="Lọc theo vai trò"
            value={roleFilter}
            onChange={(val) => {
              setRoleFilter(val);
              setPage(1);
            }}
            style={{ width: 160 }}
            allowClear
          >
            <Option value="CUSTOMER">CUSTOMER</Option>
            <Option value="STAFF">STAFF</Option>
            <Option value="ADMIN">ADMIN</Option>
          </Select>

          <Select
            placeholder="Lọc theo trạng thái"
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
            style={{ width: 160 }}
            allowClear
          >
            <Option value={true}>Hoạt động</Option>
            <Option value={false}>Đã khóa</Option>
          </Select>

          <Button type="primary" onClick={() => { setPage(1); fetchUsers(); }}>
            Tìm kiếm
          </Button>
        </Space>
      </Card>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          onChange: (newPage, newPageSize) => {
            setPage(newPage);
            setPageSize(newPageSize);
          },
        }}
        bordered
      />

      <Modal
        title={`Thay đổi vai trò: ${selectedUser?.full_name} (${selectedUser?.email})`}
        open={roleModalVisible}
        onOk={handleUpdateRole}
        confirmLoading={actionLoading}
        onCancel={() => setRoleModalVisible(false)}
        okText="Lưu thay đổi"
        cancelText="Hủy"
      >
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Chọn vai trò mới:">
            <Select
              value={selectedRole}
              onChange={(value: UserRole) => setSelectedRole(value)}
              style={{ width: "100%" }}
            >
              <Option value="CUSTOMER">CUSTOMER (Khách hàng)</Option>
              <Option value="STAFF">STAFF (Nhân viên)</Option>
              <Option value="ADMIN">ADMIN (Quản trị viên)</Option>
            </Select>
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Lưu ý: Thay đổi vai trò sẽ lập tức thu hồi tất cả refresh token hiện tại của người dùng để cập nhật phiên mới.
          </Text>
        </Form>
      </Modal>
    </div>
  );
};

export default UsersPage;
