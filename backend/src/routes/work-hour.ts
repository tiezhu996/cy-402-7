import { Router } from "express";
import * as workHourController from "../controllers/work-hour.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { auditLogInterceptor } from "../middlewares/audit-log.interceptor";
import { Permissions, permissionGuard, Roles, roleGuard } from "../middlewares/role.guard";
import { asyncHandler } from "../utils/async-handler";

const router = Router();

router.use(authMiddleware);
router.get("/", Permissions("workhour:read"), permissionGuard, asyncHandler(workHourController.list));
router.get("/:id", Permissions("workhour:read"), permissionGuard, asyncHandler(workHourController.detail));
router.get("/case/:caseId/summary", Permissions("workhour:read"), permissionGuard, asyncHandler(workHourController.summary));
router.post(
  "/",
  Roles("admin", "lawyer"),
  roleGuard,
  Permissions("workhour:write"),
  permissionGuard,
  auditLogInterceptor("create", "WorkHour"),
  asyncHandler(workHourController.create)
);
router.delete(
  "/:id",
  Roles("admin", "lawyer"),
  roleGuard,
  Permissions("workhour:write"),
  permissionGuard,
  auditLogInterceptor("delete", "WorkHour"),
  asyncHandler(workHourController.remove)
);

export default router;
