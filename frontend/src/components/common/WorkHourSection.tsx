import { Button, Popconfirm, Space, Statistic, Table, Tag, message } from "antd";
import { ClockCircleOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";
import type { WorkHour } from "../../types";
import * as workHourApi from "../../api/work-hour";
import { useCaseStore } from "../../stores/case";
import { PermissionGate } from "../../directives/permission";
import { formatDate } from "../../utils/format";
import { WorkHourFormModal } from "./WorkHourFormModal";

type Props = {
  caseId: string;
  caseStatus: string;
  workHours: WorkHour[];
  canEdit: boolean;
};

export function WorkHourSection({ caseId, caseStatus, workHours, canEdit }: Props) {
  const { fetchCase } = useCaseStore();
  const [formOpen, setFormOpen] = useState(false);

  const isClosed = caseStatus === "closed" || caseStatus === "archived";
  const totalHours = workHours.reduce((acc, w) => acc + Number(w.hours), 0);

  const columns: ColumnsType<WorkHour> = [
    {
      title: "工作日期",
      dataIndex: "workDate",
      key: "workDate",
      width: 120,
      render: (val) => formatDate(val)
    },
    {
      title: "时长（小时）",
      dataIndex: "hours",
      key: "hours",
      width: 110,
      render: (val) => (
        <Tag color="blue" icon={<ClockCircleOutlined />}>
          {Number(val).toFixed(1)} h
        </Tag>
      )
    },
    {
      title: "事项",
      dataIndex: "description",
      key: "description",
      ellipsis: true
    },
    {
      title: "律师",
      dataIndex: ["lawyer", "name"],
      key: "lawyer",
      width: 100
    },
    {
      title: "操作",
      key: "action",
      width: 80,
      render: (_, record) =>
        canEdit && !isClosed ? (
          <Popconfirm
            title="删除工时记录"
            description="确定要删除该工时记录吗？"
            okText="删除"
            cancelText="取消"
            onConfirm={async () => {
              await workHourApi.deleteWorkHour(record.id);
              message.success("工时记录已删除");
              void fetchCase(caseId);
            }}
          >
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        ) : null
    }
  ];

  return (
    <section className="work-band">
      <Space style={{ justifyContent: "space-between", width: "100%", marginBottom: 12 }}>
        <Space>
          <h3 style={{ margin: 0 }}>办案工时</h3>
          <Statistic title="累计工时" value={totalHours} suffix="小时" />
          <Statistic title="记录数" value={workHours.length} suffix="条" />
        </Space>
        <PermissionGate permission="workhour:write">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setFormOpen(true)}
            disabled={isClosed}
          >
            登记工时
          </Button>
        </PermissionGate>
      </Space>
      {isClosed && (
        <div style={{ marginBottom: 12, padding: "8px 12px", background: "#fff7e6", borderRadius: 6, color: "#d46b08" }}>
          该案件已结案/归档，不能新增或删除工时记录。
        </div>
      )}
      <Table<WorkHour>
        columns={columns}
        dataSource={workHours}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 5, hideOnSinglePage: true }}
        locale={{ emptyText: "暂无工时记录" }}
      />
      <WorkHourFormModal open={formOpen} caseId={caseId} onClose={() => setFormOpen(false)} />
    </section>
  );
}
