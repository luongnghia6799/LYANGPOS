
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export function useProductData() {
    return useQuery({
        queryKey: ['products'],
        queryFn: async () => {
            const { data } = await axios.get('/api/products');
            return data;
        },
        staleTime: 1000 * 60 * 10, // 10 minutes stale time (don't refetch if younger than this)
        cacheTime: 1000 * 60 * 60, // 1 hour cache time
    });
}

export function usePartnerData() {
    return useQuery({
        queryKey: ['partners'],
        queryFn: async () => {
            const { data } = await axios.get('/api/partners');
            return data;
        },
        staleTime: 1000 * 60 * 10,
        cacheTime: 1000 * 60 * 60,
    });
}
