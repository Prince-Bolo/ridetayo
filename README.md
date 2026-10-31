# RideTayo 🚲

A group ride organizer for bike groups in Iligan City.

Organizers (admin) post group rides, and riders can join them.

## Built With

- HTML, CSS, JavaScript
- Supabase (database + login)

## Progress

- [x] Database tables
- [x] Register and login
- [x] Admin and rider roles
- [ ] Rides (add, edit, delete, join)
- [ ] Map and bike route
- [ ] Weather and sunset time
- [ ] Ride poster upload
- [ ] Email when a rider joins
- [ ] Admin dashboard

## Setup

1. Make a Supabase project
2. Run `database.sql` in the SQL Editor
3. Turn off **Confirm email** in Authentication settings
4. Put the Project URL and key in `js/config.js`
5. Register, then make yourself admin:
```sql
update profiles set role = 'admin' where email = 'your@email.com';
```
