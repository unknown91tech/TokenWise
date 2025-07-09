
'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  Zap,
  Github,
  Twitter,
  ExternalLink,
  Heart,
  Mail,
  MessageSquare,
  BookOpen,
  Shield,
  Coffee,
  Users,
  TrendingUp,
  Database,
  Monitor,
  Wallet
} from 'lucide-react';

interface FooterLink {
  href: string;
  label: string;
  external?: boolean;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

const footerSections: FooterSection[] = [
  {
    title: 'Product',
    links: [
      { href: '/analytics', label: 'Analytics' },
      { href: '/wallets', label: 'Wallet Management' },
      { href: '/monitor', label: 'Real-time Monitor' },
      { href: '/setup', label: 'Setup Guide' },
    ]
  },
  {
    title: 'Support',
    links: [
      { href: '/help', label: 'Help Center' },
      { href: '/contact', label: 'Contact Us' },
      { href: '/community', label: 'Community' },
      { href: '/status', label: 'System Status' },
    ]
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About Us' },
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/terms', label: 'Terms of Service' },
      { href: '/security', label: 'Security' },
    ]
  }
];

const socialLinks = [
  {
    href: 'https://github.com/your-org/tokenwise',
    icon: Github,
    label: 'GitHub',
    description: 'Source code and contributions'
  },
  {
    href: 'https://twitter.com/tokenwise',
    icon: Twitter,
    label: 'Twitter',
    description: 'Latest updates and news'
  },
  {
    href: 'https://discord.gg/tokenwise',
    icon: MessageSquare,
    label: 'Discord',
    description: 'Community discussions'
  },
  {
    href: 'mailto:hello@tokenwise.io',
    icon: Mail,
    label: 'Email',
    description: 'Get in touch with us'
  }
];


export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-background border-t">
      {/* Stats Section */}
      

      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-bold">TokenWise</h2>
                <p className="text-sm text-muted-foreground">Solana Wallet Intelligence</p>
              </div>
            </div>
            
            <p className="text-muted-foreground mb-6 max-w-md">
              Advanced real-time wallet monitoring and analytics for the Solana blockchain. 
              Track transactions, analyze patterns, and gain insights into wallet behavior.
            </p>

            {/* Social Links */}
            <div className="space-y-3 mb-6">
              <h4 className="font-medium text-sm">Connect with us</h4>
              <div className="flex flex-wrap gap-2">
                {socialLinks.map((social) => (
                  <Button
                    key={social.label}
                    variant="outline"
                    size="sm"
                    asChild
                    className="gap-2"
                  >
                    <a
                      href={social.href}
                      target={social.href.startsWith('http') ? '_blank' : undefined}
                      rel={social.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      title={social.description}
                    >
                      <social.icon className="h-4 w-4" />
                      {social.label}
                      {social.href.startsWith('http') && (
                        <ExternalLink className="h-3 w-3" />
                      )}
                    </a>
                  </Button>
                ))}
              </div>
            </div>

            {/* Newsletter Signup */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Stay updated</h4>
              <div className="flex gap-2 max-w-sm">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-3 py-2 text-sm border border-input rounded-md bg-background"
                />
                <Button size="sm">
                  Subscribe
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Get the latest updates and feature announcements.
              </p>
            </div>
          </div>

          {/* Footer Links */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold mb-4">{section.title}</h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                      target={link.external ? '_blank' : undefined}
                      rel={link.external ? 'noopener noreferrer' : undefined}
                    >
                      {link.label}
                      {link.external && <ExternalLink className="h-3 w-3" />}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Bottom Section */}
      <div className="container mx-auto px-4 py-6 flex justify-center items-center">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>© {currentYear} TokenWise. All rights reserved.</span>
            <Badge variant="outline" className="gap-1">
              <Shield className="h-3 w-3" />
              Security First
            </Badge>
          </div>
        </div>

        
      </div>
    </footer>
  );
}