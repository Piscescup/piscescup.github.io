import io.github.piscescup.counter.Counter;

public class Counters {
    public static void main(String[] args) {
        Counter counter = Counter.atomic();
        counter.increment();
        counter.addAndGet(4);

        long current = counter.get();
        System.out.println(current);
    }
}
