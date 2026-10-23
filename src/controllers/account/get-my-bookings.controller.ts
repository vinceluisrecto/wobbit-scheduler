import type { Request, Response } from 'express';
import { getAuthUser } from '../../middlewares';
import { getMyBookings } from '../../services/account';
import type { MyBookingsResponse } from '../../types/account';

export async function getMyBookingsController(_req: Request, res: Response) {
  const body: MyBookingsResponse = await getMyBookings(getAuthUser(res).id);
  res.json(body);
}
