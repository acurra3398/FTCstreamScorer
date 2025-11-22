# Deploying FTC Stream Scorer Website to Vercel

Quick guide to deploy the website to Vercel.

## Quick Start

1. Push the `website/` folder to your GitHub repository
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Set **Root Directory** to: `website`
5. Click **Deploy**

## Setting up Download Counter

1. In Vercel Dashboard, go to your project
2. Click **Storage** → **Create Database** → **KV**
3. Name it `ftc-scorer-downloads` and click **Create**
4. Done! The counter will work automatically

## Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your domain
3. Update your DNS records as instructed

That's it! Your website is live 🎉
