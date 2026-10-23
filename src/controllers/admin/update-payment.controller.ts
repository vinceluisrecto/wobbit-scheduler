import type { Request, Response } from 'express';
import { updatePayment } from '../../services/admin';
import type { BookingResponse } from '../../types/bookings';
import { validateUpdatePayment } from '../../validators/admin';
import { validateUuid } from '../../validators/shared';

export async function updatePaymentController(req: Request, res: Response) {
  const id = validateUuid(req.params.id);
  const { paymentStatus } = validateUpdatePayment(req.body);
  const body: BookingResponse = { booking: await updatePayment(id, paymentStatus) };
  res.json(body);
}
