// Three ways to sum from 1 to n.



// 1. Using recursion. Worst case
var sum_to_n_a = function(n) {
    if (n === 1) {
        return 1;
    }
    return n + sum_to_n_a(n - 1);
};

// 2. Using for loop. Normal case
var sum_to_n_b = function(n) {
    let sum = 0;
    for (let i = 1; i <= n; i++) {
        sum += i;
    }
    return sum;
};

// 3. Using formula. Best case
var sum_to_n_c = function(n) {
    return (n * (n + 1)) / 2;
};
