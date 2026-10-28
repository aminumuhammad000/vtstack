'use client';

import React, { useEffect, useState } from 'react';
import NextLink from 'next/link';
import { useRouter, usePathname, useParams as useNextParams } from 'next/navigation';

export const Link = React.forwardRef<HTMLAnchorElement, any>(({ to, href, children, ...props }, ref) => {
    let dest = to || href || '#';
    // Remap /dashboard to /app
    if (dest === '/dashboard') dest = '/app';
    else if (typeof dest === 'string' && dest.startsWith('/dashboard/')) {
        dest = dest.replace('/dashboard', '/app');
    }
    return (
        <NextLink ref={ref} href={dest} {...props}>
            {children}
        </NextLink>
    );
});
Link.displayName = 'Link';

export const NavLink = React.forwardRef<HTMLAnchorElement, any>(({ to, href, className, children, end, ...props }, ref) => {
    const pathname = usePathname();
    let dest = to || href || '#';
    if (dest === '/dashboard') dest = '/app';
    else if (typeof dest === 'string' && dest.startsWith('/dashboard/')) {
        dest = dest.replace('/dashboard', '/app');
    }

    const isActive = end ? pathname === dest : pathname.startsWith(dest);
    const computedClass = typeof className === 'function' ? className({ isActive, isPending: false }) : className;

    return (
        <NextLink ref={ref} href={dest} className={computedClass} {...props}>
            {typeof children === 'function' ? children({ isActive, isPending: false }) : children}
        </NextLink>
    );
});
NavLink.displayName = 'NavLink';

export function useNavigate() {
    const router = useRouter();
    return (to: any, options?: any) => {
        let dest = to;
        if (dest === '/dashboard') dest = '/app';
        else if (typeof dest === 'string' && dest.startsWith('/dashboard/')) {
            dest = dest.replace('/dashboard', '/app');
        }

        if (typeof dest === 'number') {
            if (dest === -1) router.back();
            else router.forward();
        } else if (options?.replace) {
            router.replace(dest);
        } else {
            router.push(dest);
        }
    };
}

export function useLocation() {
    const pathname = usePathname();
    const [search, setSearch] = useState('');
    const [hash, setHash] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setSearch(window.location.search);
            setHash(window.location.hash);
        }
    }, [pathname]);

    return {
        pathname: pathname || '',
        search,
        hash,
        state: null,
    };
}

export function useSearchParams(): [any, (params: any) => void] {
    const router = useRouter();
    const pathname = usePathname();
    const [params, setParams] = useState<URLSearchParams>(() => {
        if (typeof window !== 'undefined') {
            return new URLSearchParams(window.location.search);
        }
        return new URLSearchParams();
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setParams(new URLSearchParams(window.location.search));
        }
    }, [pathname]);

    const setSearchParams = (newParams: any) => {
        const str = typeof newParams === 'string' ? newParams : new URLSearchParams(newParams).toString();
        router.push(`${pathname}?${str}`);
    };

    return [params, setSearchParams];
}

export function useParams<T extends Record<string, string | string[]> = Record<string, string>>() {
    return (useNextParams() || {}) as T;
}

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
    const router = useRouter();
    useEffect(() => {
        let dest = to;
        if (dest === '/dashboard') dest = '/app';
        else if (typeof dest === 'string' && dest.startsWith('/dashboard/')) {
            dest = dest.replace('/dashboard', '/app');
        }

        if (replace) router.replace(dest);
        else router.push(dest);
    }, [to, replace, router]);
    return null;
}

export const BrowserRouter: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
export const Routes: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
export const Route: React.FC<{ path?: string; element?: React.ReactNode }> = ({ element }) => <>{element}</>;
export const Outlet: React.FC = () => null;

export default Link;
