# RideTayo 🚲

A group ride organizer for bike groups in Iligan City.

Ride organizers usually post rides on Facebook. The route, distance, weather, and who is coming end up scattered in comments and group chats. RideTayo puts all of it in one page. The organizer posts the ride with its route, and riders can check the distance, the weather on ride day, and if they need lights, then join with one click.

## Features

**Admin (ride organizer)**
- Create, view, edit, and delete rides
- Search the meeting place or click the map to set the route
- Get the bike route, distance, ride time, and total climb automatically
- Upload a ride poster
- Dashboard with totals, most joined ride, and how full each ride is
- Change a user's role and remove riders from a ride

**Rider**
- Register and login
- Browse and search upcoming rides, filter by difficulty
- See the route map, weather forecast, and sunset time of a ride
- Join or leave a ride and get an email with the ride details

## APIs Used

| # | API | What it does in RideTayo | Key needed |
|---|-----|--------------------------|-----------|
| 1 | Leaflet + OpenStreetMap | Shows the map and the route | No |
| 2 | Nominatim (OpenStreetMap) | Finds the meeting place by name, and gets the place name when you click the map | No |
| 3 | OpenRouteService | Makes the bike route and gives the distance, ride time, and climb | Yes (free) |
| 4 | Open-Meteo | Weather forecast at the ride's start time | No |
| 5 | Sunrise-Sunset.org | Sunset time, and warns riders to bring lights | No |
| 6 | Cloudinary | Stores the ride posters and makes smaller copies for the cards | Yes (free) |
| 7 | EmailJS | Sends an email to a rider after joining | Yes (free) |

Supabase is used for the database and the login.

## Built With

- HTML, CSS, JavaScript
- Supabase (PostgreSQL database + login)
- Hosted on Vercel

## Database

| Table | What it stores |
|-------|----------------|
| profiles | Name, email, and role (admin or rider) of each user |
| rides | The rides, including the route points, distance, and poster link |
| ride_joins | Which rider joined which ride |

Row Level Security rules in `database.sql` make sure only admins can add, edit, or delete rides and change roles, and riders can only join or leave for themselves.

## How to Set Up

### 1. Supabase
1. Make a new project at supabase.com
2. Go to **SQL Editor**, paste everything from `database.sql`, then click **Run**
3. Go to **Authentication > Sign In / Providers > Email** and turn off **Confirm email**
4. Go to **Project Settings > API Keys**, copy the **Project URL** and the **publishable (or anon) key**, and paste them in `js/config.js`

### 2. Make yourself admin
Register in the app first. Then run this in the SQL Editor (use your email):
```sql
update profiles set role = 'admin' where email = 'your@email.com';
```

### 3. OpenRouteService
Sign up at account.heigit.org/signup (the free plan comes with an API key), open the **Dashboard**, copy your key, and paste it in `ORS_KEY`.

### 4. Cloudinary
1. Sign up at cloudinary.com and copy your **Cloud name**
2. Go to **Settings > Upload > Upload presets > Add upload preset**
3. Set **Signing mode** to **Unsigned**, save, and copy the preset name

### 5. EmailJS
1. Sign up at emailjs.com
2. **Email Services > Add New Service > Gmail**, then copy the **Service ID**
3. **Email Templates > Create New Template**
   - To Email: `{{to_email}}`
   - Subject: `You joined {{ride_title}}!`
   - Content:
     ```
     Hi {{to_name}},

     You joined {{ride_title}}.
     Date: {{ride_date}}
     Time: {{ride_time}}
     Meeting place: {{meeting_place}}
     Distance: {{distance}}

     See the route and weather here: {{ride_link}}

     Ride safe!
     RideTayo
     ```
   - Save and copy the **Template ID**
4. **Account > General**, copy the **Public Key**

### 6. Run it on your computer
Open the folder in VS Code, right click `index.html`, then **Open with Live Server**.
Do not just double click the file, because some APIs need a real web address.

### 7. Put it online (Vercel)
1. Push the project to GitHub
2. Go to vercel.com, click **Add New > Project**, and import the repo
3. Framework Preset: **Other**, then click **Deploy**

Every new push to GitHub updates the live site.

## Note About Keys

The Supabase key is made to be public. The data is protected by the Row Level Security rules, not by hiding the key. The OpenRouteService and EmailJS keys can also be seen in the browser. This is okay for a school project on free plans, but a real system should call those APIs from a small server or serverless function so the keys stay hidden.
