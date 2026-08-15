'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db, requireAgent, getBusinessDate } from './core';

export async function login(formData: FormData) {
  const password = formData.get('password');
  const agent = formData.get('agent');
  if (password !== process.env.APP_PASSWORD || (agent !== 'hamzah' && agent !== 'talal')) {
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

export async function markDone(formData: FormData) {
  await requireAgent();
  await db().from('rides').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', formData.get('id') as string);
  revalidatePath('/today');
}

export async function unmarkDone(formData: FormData) {
  await requireAgent();
  await db().from('rides').update({ status: 'pending', completed_at: null }).eq('id', formData.get('id') as string);
  revalidatePath('/today');
}

export async function addOneOffRide(formData: FormData) {
  const agent = await requireAgent();
  await db().from('rides').insert({
    customer_id: formData.get('customer_id'),
    agent,
    pickup: formData.get('pickup'),
    dropoff: formData.get('dropoff'),
    time: formData.get('time'),
    price: Number(formData.get('price') || 0),
    business_date: formData.get('business_date') || getBusinessDate(),
    status: 'pending',
  });
  revalidatePath('/today');
}

export async function addCustomer(formData: FormData) {
  const agent = await requireAgent();
  await db().from('customers').insert({
    agent,
    name: formData.get('name'),
    phone: formData.get('phone'),
    cliq_alias: formData.get('cliq_alias') || null,
  });
  revalidatePath('/customers');
}

export async function updateCustomer(formData: FormData) {
  await requireAgent();
  await db().from('customers').update({
    name: formData.get('name'),
    phone: formData.get('phone'),
    cliq_alias: formData.get('cliq_alias') || null,
  }).eq('id', formData.get('id') as string);
  revalidatePath('/customers');
}

export async function deleteCustomer(formData: FormData) {
  await requireAgent();
  await db().from('customers').delete().eq('id', formData.get('id') as string);
  redirect('/customers');
}

export async function addRecurringRide(formData: FormData) {
  const agent = await requireAgent();
  const days = formData.getAll('days').map(Number);
  await db().from('recurring_rides').insert({
    customer_id: formData.get('customer_id'),
    agent,
    pickup: formData.get('pickup'),
    dropoff: formData.get('dropoff'),
    time: formData.get('time'),
    price: Number(formData.get('price') || 0),
    days_of_week: days,
    active: true,
  });
  revalidatePath('/customers');
}

export async function toggleRecurringRide(formData: FormData) {
  await requireAgent();
  const active = formData.get('active') === 'true';
  await db().from('recurring_rides').update({ active: !active }).eq('id', formData.get('id') as string);
  revalidatePath('/customers');
}

export async function deleteRecurringRide(formData: FormData) {
  await requireAgent();
  await db().from('recurring_rides').delete().eq('id', formData.get('id') as string);
  revalidatePath('/customers');
}
