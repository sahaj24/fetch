# Monthly Subscription Coin Credits

This system automatically credits coins to paid subscribers on a monthly basis.

## How It Works

1. When a user subscribes via PayPal, their subscription is recorded in the `user_subscriptions` table
2. A scheduled job runs monthly to credit coins to all active subscribers
3. Each subscriber receives the number of coins associated with their plan
4. The system tracks the last payment date to prevent duplicate credits

## Setup Instructions

### 1. Database Setup

Run the SQL migration in `src/migrations/user_subscriptions.sql` to create the necessary tables:

```bash
# Connect to your Supabase database and run the SQL file
```

### 2. Environment Variables

Add the following environment variable to your `.env.local` file:

```
SUBSCRIPTION_CRON_API_KEY=your_secure_random_key_here
```

This key is used to authenticate the cron job that triggers the monthly credits.

### 3. Set Up a Cron Job

Set up a cron job to call the API endpoint monthly. You can use a service like Vercel Cron Jobs, GitHub Actions, or any other cron service.

Example cron schedule (runs on the 1st of each month at 00:00 UTC):

```
0 0 1 * *
```

The cron job should make a POST request to:

```
https://your-domain.com/api/subscriptions/monthly-credit
```

Include the API key in the Authorization header:

```
Authorization: Bearer your_secure_random_key_here
```

## Testing

You can manually test the endpoint by making a POST request with the correct Authorization header.

## Monitoring

The endpoint returns detailed results about which users were credited and any errors that occurred. You should set up logging to capture this information for troubleshooting.

## Security

- The API is protected by an API key
- Database access is controlled by Row Level Security
- Only authenticated users can view their own subscription data
- The service role is required for administrative operations
