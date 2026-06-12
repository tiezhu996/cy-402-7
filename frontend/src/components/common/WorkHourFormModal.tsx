import { DatePicker, Form, Input, InputNumber, Modal, Select, message } from "antd";
import type { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import type { User } from "../../types";
import * as workHourApi from "../../api/work-hour";
import { useUserStore } from "../../stores/user";
import { useCaseStore } from "../../stores/case";

type FormValues = {
  workDate: Dayjs;
  hours: number;
  description: string;
  lawyerId: string;
};

type Props = {
  open: boolean;
  caseId: string;
  onClose: () => void;
};

export function WorkHourFormModal({ open, caseId, onClose }: Props) {
  const { users, fetchUsers, currentUser } = useUserStore();
  const { fetchCase } = useCaseStore();
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && users.length === 0) {
      void fetchUsers();
    }
    if (open) {
      form.resetFields();
      if (currentUser?.id) {
        form.setFieldsValue({ lawyerId: currentUser.id });
      }
    }
  }, [open, users.length, fetchUsers, currentUser, form]);

  const lawyerOptions: User[] = users.filter(
    (u) => u.primaryRole === "lawyer" || u.primaryRole === "admin"
  );

  async function handleOk() {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await workHourApi.createWorkHour({
        caseId,
        workDate: values.workDate.format("YYYY-MM-DD"),
        hours: values.hours,
        description: values.description.trim(),
        lawyerId: values.lawyerId
      });
      message.success("工时登记成功");
      void fetchCase(caseId);
      onClose();
      form.resetFields();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "工时登记失败";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      title="登记办案工时"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={loading}
      okText="提交"
      cancelText="取消"
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item
          label="工作日期"
          name="workDate"
          rules={[{ required: true, message: "请选择工作日期" }]}
        >
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          label="时长（小时）"
          name="hours"
          rules={[{ required: true, message: "请输入工时" }]}
        >
          <InputNumber min={0.1} max={24} step={0.5} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          label="事项"
          name="description"
          rules={[{ required: true, message: "请输入事项描述" }]}
        >
          <Input.TextArea
            minLength={2}
            maxLength={500}
            rows={3}
            placeholder="例如：查阅案卷、起草答辩状、与当事人沟通等"
            style={{ width: "100%" }}
          />
        </Form.Item>
        <Form.Item
          label="律师"
          name="lawyerId"
          rules={[{ required: true, message: "请选择承办律师" }]}
        >
          <Select
            placeholder="请选择律师"
            options={lawyerOptions.map((u) => ({ label: u.name, value: u.id }))}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
