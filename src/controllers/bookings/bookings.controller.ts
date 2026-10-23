import type { Request, Response } from 'express';
import { getAuthUser } from '../../middlewares';
import { cancelBooking, createBooking, getBooking } from '../../services/bookings';
import type { BookingResponse } from '../../types/bookings';
import { validateUuid } from '../../validators/shared';

// POST /api/sessions/:id/bookings — no body needed.
export async function createBookingController(req: Request, res: Response) {
  const body: BookingResponse = { booking: await createBooking(validateUuid(req.params.id), getAuthUser(res)) };
  res.status(201).json(body);
}

export async function getBookingController(req: Request, res: Response) {
  const body: BookingResponse = { booking: await getBooking(validateUuid(req.params.id), getAuthUser(res)) };
  res.json(body);
}

export async function cancelBookingController(req: Request, res: Response) {
  const body: BookingResponse = { booking: await cancelBooking(validateUuid(req.params.id), getAuthUser(res)) };
  res.json(body);
}
