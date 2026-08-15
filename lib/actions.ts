'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db, requireAgent, getBusinessDate, legCompletedField, legSkippedField, type Leg } from './core';

export async function login(formData: FormData) {
  const password = formData.get('password');
  const agent = formData.get('agent');
  if (password !== process.env.APP_PASSWORD || (agent !== 'Hamzah' && agent !== 'Talal')) {
    redirect('/login?error=1');
  }
  const store = await cookies();
  store.set('hth_agent', agent as string, {
    httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365, path: '/',
  });
  redirect('/today');
}

export async function logout() {
  const store = await cookies();
  store.delete('hth_agent');
  redirect('/login');
}

export async function completeLeg(formData: FormData) {
  const agent = await requireAgent();
  const rideId = formData.get('ride_id') as string;
  const leg = formData.get('leg') as Leg;
  const name = formData.get('name') as string;
  const amount = Number(formData.get('amount') || 0);
  const bDay = getBusinessDate();

  await db().from('rides').update({ [legCompletedField(leg)]: bDay }).eq('id', rideId);
  await db().from('trip_history').insert({
    ride_id: rideId, agent, customer_name: name, leg, amount, business_day: bDay,
  });
  revalidatePath('/today');
}

export async function uncompleteLeg(formData: FormData) {
  await requireAgent();
  const rideId = formData.get('ride_id') as string;
  const leg = formData.get('leg') as Leg;
  const bDay = getBusinessDate();

  await db().from('rides').update({ [legCompletedField(leg)]: null }).eq('id', rideId);
  await db().from('trip_history').delete().eq('ride_id', rideId).eq('leg', leg).eq('business_day', bDay);
  revalidatePath('/today');
}

export async function skipLeg(formData: FormData) {
  await requireAgent();
  const rideId = formData.get('ride_id') as string;
  const leg = formData.get('leg') as Leg;
  await db().from('rides').update({ [legSkippedField(leg)]: getBusinessDate() }).eq('id', rideId);
  revalidatePath('/today');
}

export async function unskipLeg(formData: FormData) {
  await requireAgent();
  const rideId = formData.get('ride_id') as string;
  const leg = formData.get('leg') as Leg;
  await db().from('rides').update({ [legSkippedField(leg)]: null }).eq('id', rideId);
  revalidatePath('/today');
}

export async function addOneOffRide(formData: FormData) {
  const agent = await requireAgent();
  await db().from('rides').insert({
    agent,
    name: formData.get('name'),
    mobile_number: formData.get('mobile_number') || '',
    to_work_enabled: true,
    to_work_pickup: formData.get('pickup'),
    to_work_dest: formData.get('dropoff'),
    to_work_time: formData.get('time'),
    way_back_enabled: false,
    amount: Number(formData.get('amount') || 0),
    days_of_week: [],
    one_time_date: formData.get('business_date'),
    active: true,
  });
  revalidatePath('/today');
}

export async function saveRide(formData: FormData) {
  const agent = await requireAgent();
  const id = formData.get('id') as string | null;
  const days = formData.getAll('days').map(Number);
  const oneTimeDate = (formData.get('one_time_date') as string) || null;

  const payload: any = {
    name: formData.get('name'),
    mobile_number: formData.get('mobile_number') || '',
    building_number: formData.get('building_number') || '',
    street_name: formData.get('street_name') || '',
    notes: formData.get('notes') || '',
    cliq_alias: formData.get('cliq_alias') || null,
    to_work_enabled: formData.get('to_work_enabled') === 'on',
    to_work_pickup: formData.get('to_work_pickup') || '',
    to_work_dest: formData.get('to_work_dest') || '',
    to_work_time: formData.get('to_work_time') || null,
    way_back_enabled: formData.get('way_back_enabled') === 'on',
    way_back_pickup: formData.get('way_back_pickup') || '',
    way_back_dest: formData.get('way_back_dest') || '',
    way_back_time: formData.get('way_back_time') || null,
    amount: Number(formData.get('amount') || 0),
    days_of_week: oneTimeDate ? [] : days,
    one_time_date: oneTimeDate,
  };

  if (id) {
    await db().from('rides').update(payload).eq('id', id);
  } else {
    payload.agent = agent;
    payload.active = true;
    await db().from('rides').insert(payload);
  }
  revalidatePath('/customers');
  revalidatePath('/today');
}

export async function toggleActive(formData: FormData) {
  await requireAgent();
  const active = formData.get('active') === 'true';
  await db().from('rides').update({ active: !active }).eq('id', formData.get('id') as string);
  revalidatePath('/customers');
}

export async function deleteRide(formData: FormData) {
  await requireAgent();
  await db().from('rides').delete().eq('id', formData.get('id') as string);
  redirect('/customers');
}
